/**
 * ChargeShield Physics & Meter Anomaly Validation Module
 * Validates physical plausibility of meter readings:
 * 1. Power capacity bounds check (kW vs rated power)
 * 2. Meter rollback check (monotonically non-decreasing energy)
 */

const { REGISTERED_CHARGERS, RISK_WEIGHTS, DETECTION_TYPES } = require('../config/constants');

class PhysicsCheck {
  constructor() {
    // chargerId -> lastCumulativeEnergyWh
    this.meterHistory = new Map();
  }

  /**
   * Reset meter history for a charger (e.g., when a new session starts)
   */
  resetHistory(chargerId, initialWh = 0) {
    this.meterHistory.set(chargerId, initialWh);
  }

  /**
   * Evaluate physics & meter constraints for incoming message
   * @param {Object} context - { chargerId, raw }
   * @returns {Object} - { passed, detectionType, riskScore, reason, extractedMetrics }
   */
  evaluate(context) {
    const { chargerId, raw } = context;
    const [, , action, payload] = raw;

    // Physics check is only relevant for MeterValues or Start/StopTransaction readings
    if (action !== 'MeterValues' && action !== 'StartTransaction' && action !== 'StopTransaction') {
      return {
        passed: true,
        detectionType: DETECTION_TYPES.NORMAL,
        riskScore: 0,
        reason: 'Physics check skipped (not a meter reading action).'
      };
    }

    const chargerConfig = REGISTERED_CHARGERS[chargerId];
    const ratedPowerKw = chargerConfig ? chargerConfig.ratedPowerKw : 22.0;

    // 1. Evaluate StartTransaction initial meter
    if (action === 'StartTransaction') {
      const meterStartWh = payload.meterStart || 0;
      this.meterHistory.set(chargerId, meterStartWh);
      return {
        passed: true,
        detectionType: DETECTION_TYPES.NORMAL,
        riskScore: 0,
        reason: `Initial meter reading recorded: ${meterStartWh} Wh`
      };
    }

    // 2. Evaluate StopTransaction final meter
    if (action === 'StopTransaction') {
      const meterStopWh = payload.meterStop || 0;
      const lastWh = this.meterHistory.get(chargerId) || 0;

      if (meterStopWh < lastWh) {
        return {
          passed: false,
          detectionType: DETECTION_TYPES.METER_ROLLBACK,
          riskScore: RISK_WEIGHTS.METER_ROLLBACK,
          reason: `Meter Rollback detected at StopTransaction: Final meter (${meterStopWh} Wh) is lower than previously recorded (${lastWh} Wh).`
        };
      }
      this.meterHistory.set(chargerId, meterStopWh);
      return {
        passed: true,
        detectionType: DETECTION_TYPES.NORMAL,
        riskScore: 0,
        reason: `Final meter reading verified: ${meterStopWh} Wh`
      };
    }

    // 3. Evaluate MeterValues
    if (action === 'MeterValues') {
      let reportedPowerW = null;
      let reportedEnergyWh = null;

      // Parse sampled values from OCPP 1.6J structure
      if (Array.isArray(payload.meterValue)) {
        for (const mv of payload.meterValue) {
          if (Array.isArray(mv.sampledValue)) {
            for (const sample of mv.sampledValue) {
              const numVal = parseFloat(sample.value);
              if (isNaN(numVal)) continue;

              const measurand = sample.measurand || 'Energy.Active.Import.Register';
              const unit = sample.unit || 'Wh';

              if (measurand.includes('Power.Active') || measurand.includes('Power')) {
                // Normalize power to Watts
                if (unit.toLowerCase() === 'kw') {
                  reportedPowerW = numVal * 1000;
                } else {
                  reportedPowerW = numVal;
                }
              }

              if (measurand.includes('Energy.Active') || measurand.includes('Energy')) {
                // Normalize energy to Wh
                if (unit.toLowerCase() === 'kwh') {
                  reportedEnergyWh = numVal * 1000;
                } else {
                  reportedEnergyWh = numVal;
                }
              }
            }
          }
        }
      }

      // Check 1: Power capacity overload (Physics check)
      if (reportedPowerW !== null) {
        const reportedPowerKw = reportedPowerW / 1000;
        // Allow a small 5% electrical tolerance margin
        const maxAllowedKw = ratedPowerKw * 1.05;

        if (reportedPowerKw > maxAllowedKw) {
          return {
            passed: false,
            detectionType: DETECTION_TYPES.METER_ANOMALY,
            riskScore: RISK_WEIGHTS.METER_ANOMALY,
            reason: `Physics Anomaly: Reported active power (${reportedPowerKw.toFixed(1)} kW) exceeds rated hardware capacity (${ratedPowerKw} kW) for charger '${chargerId}'.`,
            metrics: { reportedPowerKw, ratedPowerKw }
          };
        }
      }

      // Check 2: Meter Rollback (Energy decrease check)
      if (reportedEnergyWh !== null) {
        const lastWh = this.meterHistory.get(chargerId);

        if (lastWh !== undefined && reportedEnergyWh < lastWh) {
          return {
            passed: false,
            detectionType: DETECTION_TYPES.METER_ROLLBACK,
            riskScore: RISK_WEIGHTS.METER_ROLLBACK,
            reason: `Meter Rollback detected: Reported energy (${reportedEnergyWh} Wh) decreased from last recorded (${lastWh} Wh).`,
            metrics: { reportedEnergyWh, lastWh }
          };
        }

        // Update meter state on valid reading
        this.meterHistory.set(chargerId, reportedEnergyWh);
      }

      return {
        passed: true,
        detectionType: DETECTION_TYPES.NORMAL,
        riskScore: 0,
        reason: `Meter physics valid (Power: ${reportedPowerW ? (reportedPowerW / 1000).toFixed(1) + ' kW' : 'N/A'}, Energy: ${reportedEnergyWh ? reportedEnergyWh + ' Wh' : 'N/A'}).`
      };
    }

    return {
      passed: true,
      detectionType: DETECTION_TYPES.NORMAL,
      riskScore: 0,
      reason: 'Physics validation passed.'
    };
  }
}

module.exports = new PhysicsCheck();

/**
 * ChargeShield Grid Load Monitoring Module (Stage 6)
 * Tracks current active power per charger across the charging network.
 * Computes aggregate electrical load against configured substation capacity.
 * - Warning band (>= 80% and <= 100%): ALERT with MEDIUM severity.
 * - Over capacity (> 100%): ALERT with CRITICAL severity (forced ALERT, cannot block the grid).
 * - Removes active power on StopTransaction, session end, or charger disconnect.
 */

const { GRID_CONFIG, RISK_WEIGHTS, DETECTION_TYPES, SECURITY_ACTIONS } = require('../config/constants');

class GridCheck {
  constructor() {
    // chargerId -> activePowerKw
    this.activeChargerPower = new Map();
  }

  /**
   * Reset all state (useful for unit tests)
   */
  resetState() {
    this.activeChargerPower.clear();
  }

  /**
   * Remove a charger's active power reading (on StopTransaction, disconnect, etc.)
   * @param {string} chargerId
   */
  removeChargerPower(chargerId) {
    if (chargerId && this.activeChargerPower.has(chargerId)) {
      this.activeChargerPower.delete(chargerId);
    }
  }

  /**
   * Update or set active power for a charger
   * @param {string} chargerId
   * @param {number} powerKw
   */
  setChargerPower(chargerId, powerKw) {
    if (chargerId) {
      this.activeChargerPower.set(chargerId, Math.max(0, parseFloat(powerKw) || 0));
    }
  }

  /**
   * Get current aggregate load metrics
   */
  getGridStats() {
    let currentLoadKw = 0;
    for (const kw of this.activeChargerPower.values()) {
      currentLoadKw += kw;
    }
    // Round to 2 decimal places
    currentLoadKw = Math.round(currentLoadKw * 100) / 100;

    const capacityKw = GRID_CONFIG.GRID_CAPACITY_KW;
    const warningThresholdKw = GRID_CONFIG.WARNING_THRESHOLD_KW;
    const utilizationPercent = capacityKw > 0 ? Math.round((currentLoadKw / capacityKw) * 1000) / 10 : 0;

    let status = 'NORMAL';
    if (currentLoadKw > capacityKw) {
      status = 'OVERLOAD';
    } else if (currentLoadKw >= warningThresholdKw) {
      status = 'WARNING';
    }

    return {
      currentLoadKw,
      gridCapacityKw: capacityKw,
      warningThresholdKw,
      utilizationPercent,
      activeChargersCount: this.activeChargerPower.size,
      status
    };
  }

  /**
   * Extract active power in kW from an incoming message payload
   */
  extractPowerKw(action, payload) {
    if (action !== 'MeterValues' || !payload || !Array.isArray(payload.meterValue)) {
      return null;
    }

    for (const mv of payload.meterValue) {
      if (Array.isArray(mv.sampledValue)) {
        for (const sample of mv.sampledValue) {
          const numVal = parseFloat(sample.value);
          if (isNaN(numVal)) continue;

          const measurand = sample.measurand || '';
          const unit = sample.unit || 'W';

          if (measurand.includes('Power.Active') || measurand.includes('Power')) {
            if (unit.toLowerCase() === 'kw') {
              return numVal;
            }
            return numVal / 1000;
          }
        }
      }
    }
    return null;
  }

  /**
   * Evaluate grid load for incoming message
   * @param {Object} context - { chargerId, raw }
   */
  evaluate(context) {
    const { chargerId, raw } = context;
    if (!chargerId) {
      return { passed: true, stage: 'Grid Load Check', detectionType: DETECTION_TYPES.NORMAL, riskScore: 0 };
    }

    const action = Array.isArray(raw) ? raw[2] : (context.action || 'UNKNOWN');
    const payload = Array.isArray(raw) ? raw[3] : (context.payload || {});

    // 1. If StopTransaction, remove charger power so load drops
    if (action === 'StopTransaction') {
      this.removeChargerPower(chargerId);
    }

    // 2. If MeterValues contains power reading, update active power
    if (action === 'MeterValues') {
      const powerKw = this.extractPowerKw(action, payload);
      if (powerKw !== null) {
        this.setChargerPower(chargerId, powerKw);
      }
    }

    // 3. Compute aggregate grid load
    const stats = this.getGridStats();
    const { currentLoadKw, gridCapacityKw, warningThresholdKw, utilizationPercent } = stats;

    // Over capacity: (> 35.0 kW) -> ALERT with CRITICAL severity
    if (currentLoadKw > gridCapacityKw) {
      return {
        passed: false,
        stage: 'Grid Load Check',
        detectionType: DETECTION_TYPES.GRID_LOAD_EXCEEDED,
        riskScore: RISK_WEIGHTS.GRID_LOAD_ATTACK,
        severity: 'CRITICAL',
        forcedAction: SECURITY_ACTIONS.ALERT,
        metrics: stats,
        reason: `Grid Load Attack: Aggregate charging demand (${currentLoadKw.toFixed(1)} kW) exceeds total substation capacity (${gridCapacityKw} kW)! Utilization at ${utilizationPercent.toFixed(1)}%.`
      };
    }

    // Warning band: (>= 28.0 kW and <= 35.0 kW) -> ALERT with MEDIUM severity
    if (currentLoadKw >= warningThresholdKw) {
      return {
        passed: false,
        stage: 'Grid Load Check',
        detectionType: DETECTION_TYPES.GRID_LOAD_WARNING,
        riskScore: RISK_WEIGHTS.GRID_LOAD_WARNING,
        severity: 'MEDIUM',
        forcedAction: SECURITY_ACTIONS.ALERT,
        metrics: stats,
        reason: `Grid Load Warning: Aggregate charging demand (${currentLoadKw.toFixed(1)} kW) reached ${utilizationPercent.toFixed(1)}% of grid capacity (threshold: ${warningThresholdKw} kW).`
      };
    }

    // Below warning (< 28.0 kW): Normal operating band
    return {
      passed: true,
      stage: 'Grid Load Check',
      detectionType: DETECTION_TYPES.NORMAL,
      riskScore: 0,
      metrics: stats,
      reason: `Grid load normal (${currentLoadKw.toFixed(1)} kW / ${gridCapacityKw} kW, ${utilizationPercent.toFixed(1)}% utilization).`
    };
  }
}

module.exports = new GridCheck();

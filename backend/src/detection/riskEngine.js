/**
 * ChargeShield Risk Scoring Engine
 * Computes composite risk score (0-100), assigns severity band, and makes decision.
 */

const { RISK_BANDS, SECURITY_ACTIONS } = require('../config/constants');

class RiskEngine {
  /**
   * Determine risk score, severity band, and security action
   * @param {Array<Object>} checkResults - Results from each stage of pipeline
   * @returns {Object} - { riskScore, severity, action, primaryDetection, reasons }
   */
  computeScoreAndDecision(checkResults) {
    let rawScore = 0;
    const failures = [];
    const detections = [];

    for (const res of checkResults) {
      if (res && !res.passed) {
        rawScore += (res.riskScore || 0);
        failures.push(res.reason);
        if (res.detectionType && !detections.includes(res.detectionType)) {
          detections.push(res.detectionType);
        }
      }
    }

    // Cap total risk score at 100
    const finalScore = Math.min(Math.max(rawScore, 0), 100);

    // Compute Severity Band
    let severity = 'LOW';
    if (finalScore >= RISK_BANDS.CRITICAL.min) {
      severity = RISK_BANDS.CRITICAL.label;
    } else if (finalScore >= RISK_BANDS.HIGH.min) {
      severity = RISK_BANDS.HIGH.label;
    } else if (finalScore >= RISK_BANDS.MEDIUM.min) {
      severity = RISK_BANDS.MEDIUM.label;
    } else {
      severity = RISK_BANDS.LOW.label;
    }

    // Determine Action: ALLOW, BLOCK, or ALERT
    let action = SECURITY_ACTIONS.ALLOW;
    let primaryDetection = 'Normal';

    if (failures.length > 0) {
      action = SECURITY_ACTIONS.BLOCK;
      primaryDetection = detections[0] || 'Security Anomaly';
    }

    return {
      riskScore: finalScore,
      severity,
      action,
      primaryDetection,
      reasons: failures.length > 0 ? failures : ['All security checks passed.']
    };
  }
}

module.exports = new RiskEngine();

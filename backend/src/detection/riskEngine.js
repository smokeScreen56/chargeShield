/**
 * ChargeShield Risk Scoring Engine
 * Computes composite risk score (0-100), assigns severity band, and makes decision.
 * Follows decision policy: LOW -> ALLOW, MEDIUM -> ALERT, HIGH/CRITICAL -> BLOCK.
 * Supports stage forced actions (e.g. forced ALERT on CRITICAL grid overload).
 * Highest severity wins; risk scores aggregate.
 */

const { RISK_BANDS, SECURITY_ACTIONS, SEVERITY_LEVELS, DECISION_POLICY } = require('../config/constants');

class RiskEngine {
  /**
   * Determine risk score, severity band, and security action
   * @param {Array<Object>} checkResults - Results from each stage of pipeline
   * @returns {Object} - { riskScore, severity, action, primaryDetection, primaryStage, reasons }
   */
  computeScoreAndDecision(checkResults) {
    let rawScore = 0;
    const failures = [];
    const detections = [];
    let primaryFailureStage = null;
    let highestSeverityLevel = 1;
    let highestSeverity = 'LOW';
    let forcedAction = null;

    for (const res of checkResults) {
      if (!res) continue;

      // Handle failed checks or stages that require action
      if (!res.passed) {
        rawScore += (res.riskScore || 0);
        failures.push(res.reason || `${res.detectionType || 'Anomaly'} detected in ${res.stage || 'pipeline'}`);

        if (res.detectionType && !detections.includes(res.detectionType)) {
          detections.push(res.detectionType);
        }

        if (!primaryFailureStage && res.stage) {
          primaryFailureStage = res.stage;
        }

        // Check if this stage specifies an explicit severity
        if (res.severity && SEVERITY_LEVELS[res.severity]) {
          const level = SEVERITY_LEVELS[res.severity];
          if (level > highestSeverityLevel) {
            highestSeverityLevel = level;
            highestSeverity = res.severity;
            if (res.stage) primaryFailureStage = res.stage;
          }
        }

        // Check for forced actions (BLOCK takes highest precedence, then ALERT)
        if (res.forcedAction) {
          if (res.forcedAction === SECURITY_ACTIONS.BLOCK) {
            forcedAction = SECURITY_ACTIONS.BLOCK;
          } else if (res.forcedAction === SECURITY_ACTIONS.ALERT && forcedAction !== SECURITY_ACTIONS.BLOCK) {
            forcedAction = SECURITY_ACTIONS.ALERT;
          } else if (res.forcedAction === SECURITY_ACTIONS.ALLOW && !forcedAction) {
            forcedAction = SECURITY_ACTIONS.ALLOW;
          }
        }
      }
    }

    // Cap total risk score at 100
    const finalScore = Math.min(Math.max(rawScore, 0), 100);

    // Compute score-based severity from score bands
    let scoreSeverity = 'LOW';
    if (finalScore >= RISK_BANDS.CRITICAL.min) {
      scoreSeverity = RISK_BANDS.CRITICAL.label;
    } else if (finalScore >= RISK_BANDS.HIGH.min) {
      scoreSeverity = RISK_BANDS.HIGH.label;
    } else if (finalScore >= RISK_BANDS.MEDIUM.min) {
      scoreSeverity = RISK_BANDS.MEDIUM.label;
    }

    // Highest severity wins (between score-derived severity and stage-explicit severity)
    const scoreSeverityLevel = SEVERITY_LEVELS[scoreSeverity] || 1;
    if (scoreSeverityLevel > highestSeverityLevel) {
      highestSeverity = scoreSeverity;
      highestSeverityLevel = scoreSeverityLevel;
    }

    // Determine Action:
    // If a stage requested a forcedAction, that overrides the score-based policy
    // Otherwise follow DECISION_POLICY: LOW -> ALLOW, MEDIUM -> ALERT, HIGH/CRITICAL -> BLOCK
    let action = forcedAction || DECISION_POLICY[highestSeverity] || SECURITY_ACTIONS.ALLOW;
    let primaryDetection = detections[0] || (failures.length > 0 ? 'Security Anomaly' : 'Normal');

    if (failures.length === 0 && !forcedAction) {
      action = SECURITY_ACTIONS.ALLOW;
      highestSeverity = 'LOW';
      primaryDetection = 'Normal';
    }

    return {
      riskScore: finalScore,
      severity: highestSeverity,
      action,
      primaryDetection,
      primaryStage: primaryFailureStage || 'All Stages',
      reasons: failures.length > 0 ? failures : ['All security checks passed.']
    };
  }
}

module.exports = new RiskEngine();

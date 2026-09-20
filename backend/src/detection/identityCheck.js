/**
 * ChargeShield Identity Verification Module
 * Validates whether the connecting charger is authorized and detects identity impersonation.
 */

const { REGISTERED_CHARGERS, RISK_WEIGHTS, DETECTION_TYPES } = require('../config/constants');

class IdentityCheck {
  /**
   * Evaluates identity integrity of an incoming message
   * @param {Object} context - { chargerId, socketMeta, clientIp, raw }
   * @returns {Object} - { passed, detectionType, riskScore, reason }
   */
  evaluate(context) {
    const { chargerId, socketMeta } = context;

    // 1. Registered Charger Check
    if (!REGISTERED_CHARGERS[chargerId]) {
      return {
        passed: false,
        detectionType: DETECTION_TYPES.UNAUTHORIZED_CHARGER,
        riskScore: RISK_WEIGHTS.UNAUTHORIZED_CHARGER,
        reason: `Unauthorized charger '${chargerId}' is not present in the ChargeShield registry.`
      };
    }

    // 2. Charger Impersonation Check (Multiple concurrent connections claiming same identity)
    if (socketMeta && socketMeta.isDuplicate) {
      return {
        passed: false,
        detectionType: DETECTION_TYPES.CHARGER_IMPERSONATION,
        riskScore: RISK_WEIGHTS.CHARGER_IMPERSONATION,
        reason: `Charger impersonation detected: simultaneous connection attempt using registered ID '${chargerId}'.`
      };
    }

    return {
      passed: true,
      detectionType: DETECTION_TYPES.NORMAL,
      riskScore: 0,
      reason: `Charger '${chargerId}' identity verified.`
    };
  }
}

module.exports = new IdentityCheck();

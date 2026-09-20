/**
 * ChargeShield OCPP 1.6J Basic Validation Module
 * Verifies message structure, types, and mandatory field requirements.
 */

const { OCPP_MESSAGE_TYPE, RISK_WEIGHTS, DETECTION_TYPES } = require('../config/constants');

const KNOWN_ACTIONS = [
  'BootNotification',
  'Heartbeat',
  'Authorize',
  'StartTransaction',
  'MeterValues',
  'StopTransaction',
  'Reset'
];

class OcppValidation {
  /**
   * Evaluates OCPP 1.6J protocol compliance
   * @param {Object} context - { raw, chargerId }
   * @returns {Object} - { passed, detectionType, riskScore, reason }
   */
  evaluate(context) {
    const { raw, chargerId } = context;

    // 1. Structure check: Must be an Array of length 4 for CALL messages
    if (!Array.isArray(raw)) {
      return {
        passed: false,
        detectionType: DETECTION_TYPES.MALFORMED_OCPP,
        riskScore: RISK_WEIGHTS.MALFORMED_MESSAGE,
        reason: `Malformed OCPP message: Expected JSON array format.`
      };
    }

    const [messageTypeId, uniqueId, action, payload] = raw;

    // Check message type
    if (messageTypeId !== OCPP_MESSAGE_TYPE.CALL) {
      return {
        passed: false,
        detectionType: DETECTION_TYPES.MALFORMED_OCPP,
        riskScore: RISK_WEIGHTS.MALFORMED_MESSAGE,
        reason: `Unsupported OCPP message type ID: ${messageTypeId}.`
      };
    }

    // Check unique ID
    if (!uniqueId || typeof uniqueId !== 'string') {
      return {
        passed: false,
        detectionType: DETECTION_TYPES.MALFORMED_OCPP,
        riskScore: RISK_WEIGHTS.MALFORMED_MESSAGE,
        reason: `Missing or invalid UniqueId in OCPP CALL frame.`
      };
    }

    // Check action
    if (!action || typeof action !== 'string' || !KNOWN_ACTIONS.includes(action)) {
      return {
        passed: false,
        detectionType: DETECTION_TYPES.MALFORMED_OCPP,
        riskScore: RISK_WEIGHTS.MALFORMED_MESSAGE,
        reason: `Unrecognized or unsupported OCPP action '${action}'.`
      };
    }

    // Check payload object
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return {
        passed: false,
        detectionType: DETECTION_TYPES.MALFORMED_OCPP,
        riskScore: RISK_WEIGHTS.MALFORMED_MESSAGE,
        reason: `Invalid payload for action '${action}': must be a JSON object.`
      };
    }

    // Basic required field checks for supported actions
    const fieldValidation = this.checkRequiredFields(action, payload);
    if (!fieldValidation.valid) {
      return {
        passed: false,
        detectionType: DETECTION_TYPES.MALFORMED_OCPP,
        riskScore: RISK_WEIGHTS.MALFORMED_MESSAGE,
        reason: `Protocol schema violation in '${action}': ${fieldValidation.reason}`
      };
    }

    return {
      passed: true,
      detectionType: DETECTION_TYPES.NORMAL,
      riskScore: 0,
      reason: `OCPP 1.6J structural validation passed for '${action}'.`
    };
  }

  checkRequiredFields(action, payload) {
    switch (action) {
      case 'BootNotification':
        if (!payload.chargePointVendor || !payload.chargePointModel) {
          return { valid: false, reason: 'Missing chargePointVendor or chargePointModel' };
        }
        break;

      case 'Authorize':
        if (!payload.idTag) {
          return { valid: false, reason: 'Missing idTag' };
        }
        break;

      case 'StartTransaction':
        if (payload.connectorId === undefined || !payload.idTag || payload.meterStart === undefined) {
          return { valid: false, reason: 'Missing connectorId, idTag, or meterStart' };
        }
        break;

      case 'StopTransaction':
        if (payload.transactionId === undefined || payload.meterStop === undefined) {
          return { valid: false, reason: 'Missing transactionId or meterStop' };
        }
        break;

      case 'MeterValues':
        if (payload.connectorId === undefined || !Array.isArray(payload.meterValue)) {
          return { valid: false, reason: 'Missing connectorId or meterValue array' };
        }
        break;
    }

    return { valid: true };
  }
}

module.exports = new OcppValidation();

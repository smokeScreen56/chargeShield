/**
 * ChargeShield Session Integrity Check Module
 * Tracks session state per charger and detects out-of-sequence or duplicate session anomalies.
 */

const { RISK_WEIGHTS, DETECTION_TYPES } = require('../config/constants');

const SESSION_STATES = {
  IDLE: 'IDLE',
  AUTHORIZED: 'AUTHORIZED',
  CHARGING: 'CHARGING'
};

class SessionCheck {
  constructor() {
    // chargerId -> { state, activeTransactionId, idTag, startedAt, lastMeter }
    this.sessions = new Map();
  }

  /**
   * Get or initialize session state for a charger
   */
  getSession(chargerId) {
    if (!this.sessions.has(chargerId)) {
      this.sessions.set(chargerId, {
        state: SESSION_STATES.IDLE,
        activeTransactionId: null,
        idTag: null,
        startedAt: null,
        lastMeterWh: 0
      });
    }
    return this.sessions.get(chargerId);
  }

  /**
   * Evaluate session integrity for an incoming OCPP CALL message
   * @param {Object} context - { chargerId, raw }
   * @returns {Object} - { passed, detectionType, riskScore, reason }
   */
  evaluate(context) {
    const { chargerId, raw } = context;
    const [, , action, payload] = raw;
    const session = this.getSession(chargerId);

    switch (action) {
      case 'Authorize':
        // Transition to AUTHORIZED
        session.state = SESSION_STATES.AUTHORIZED;
        session.idTag = payload.idTag;
        return {
          passed: true,
          detectionType: DETECTION_TYPES.NORMAL,
          riskScore: 0,
          reason: `Session state transitioned to AUTHORIZED for ${chargerId}.`
        };

      case 'StartTransaction':
        // Check for duplicate active transaction
        if (session.state === SESSION_STATES.CHARGING) {
          return {
            passed: false,
            detectionType: DETECTION_TYPES.INVALID_SESSION,
            riskScore: RISK_WEIGHTS.INVALID_SESSION,
            reason: `Invalid Session: StartTransaction received while charger '${chargerId}' already has active transaction ID #${session.activeTransactionId}.`
          };
        }
        return {
          passed: true,
          detectionType: DETECTION_TYPES.NORMAL,
          riskScore: 0,
          reason: `Session valid for StartTransaction on ${chargerId}.`
        };

      case 'StopTransaction':
        // Anomaly: StopTransaction received when no active transaction exists
        if (session.state !== SESSION_STATES.CHARGING) {
          return {
            passed: false,
            detectionType: DETECTION_TYPES.INVALID_SESSION,
            riskScore: RISK_WEIGHTS.INVALID_SESSION,
            reason: `Invalid Session: StopTransaction (Tx #${payload.transactionId || 'unknown'}) received on '${chargerId}' without an active charging session (current state: ${session.state}).`
          };
        }
        return {
          passed: true,
          detectionType: DETECTION_TYPES.NORMAL,
          riskScore: 0,
          reason: `Session valid for StopTransaction on ${chargerId}.`
        };

      case 'MeterValues':
        // Meter values without an active charging session
        if (session.state !== SESSION_STATES.CHARGING) {
          return {
            passed: false,
            detectionType: DETECTION_TYPES.INVALID_SESSION,
            riskScore: RISK_WEIGHTS.INVALID_SESSION,
            reason: `Invalid Session: MeterValues reported by '${chargerId}' while in ${session.state} state (no active transaction).`
          };
        }
        return {
          passed: true,
          detectionType: DETECTION_TYPES.NORMAL,
          riskScore: 0,
          reason: `Session valid for MeterValues on ${chargerId}.`
        };

      default:
        return {
          passed: true,
          detectionType: DETECTION_TYPES.NORMAL,
          riskScore: 0,
          reason: `Action '${action}' allowed in state ${session.state}.`
        };
    }
  }

  /**
   * Commit state update after a message has been successfully ALLOWED
   */
  updateSessionOnSuccess(chargerId, action, payload) {
    const session = this.getSession(chargerId);

    if (action === 'StartTransaction') {
      session.state = SESSION_STATES.CHARGING;
      session.activeTransactionId = payload.transactionId || Math.floor(Math.random() * 90000) + 10000;
      session.startedAt = new Date();
      session.lastMeterWh = payload.meterStart || 0;
    } else if (action === 'StopTransaction') {
      session.state = SESSION_STATES.IDLE;
      session.activeTransactionId = null;
      session.idTag = null;
      session.startedAt = null;
    }
  }

  /**
   * Get current session status summary for all chargers
   */
  getAllSessionStates() {
    const summary = {};
    for (const [id, s] of this.sessions.entries()) {
      summary[id] = {
        state: s.state,
        activeTransactionId: s.activeTransactionId,
        idTag: s.idTag,
        startedAt: s.startedAt
      };
    }
    return summary;
  }
}

module.exports = new SessionCheck();

/**
 * ChargeShield Configuration Constants
 * Source of Truth for Registered Chargers, Physics Thresholds, and Risk Weights
 */

// OCPP 1.6J Message Type Identifiers
const OCPP_MESSAGE_TYPE = {
  CALL: 2,        // Client to Server Request
  CALL_RESULT: 3, // Server to Client Response
  CALL_ERROR: 4   // Server to Client Error
};

// Registered Chargers in the System
const REGISTERED_CHARGERS = {
  'CP001': {
    id: 'CP001',
    name: 'ChargePoint Alpha',
    location: 'North Bay 1',
    ratedPowerKw: 7.4,    // 7.4 kW Level 2 AC Charger
    connectorType: 'Type 2',
    status: 'Online'
  },
  'CP002': {
    id: 'CP002',
    name: 'ChargePoint Beta',
    location: 'North Bay 2',
    ratedPowerKw: 22.0,   // 22.0 kW Fast AC Charger
    connectorType: 'CCS / Type 2',
    status: 'Online'
  },
  'CP003': {
    id: 'CP003',
    name: 'ChargePoint Gamma',
    location: 'South Bay 1',
    ratedPowerKw: 11.0,   // 11.0 kW Standard 3-Phase Charger
    connectorType: 'Type 2',
    status: 'Online'
  }
};

// Risk Score Weights based on Project Specification
const RISK_WEIGHTS = {
  UNAUTHORIZED_CHARGER: 40,
  CHARGER_IMPERSONATION: 40,
  METER_ANOMALY: 30,
  METER_ROLLBACK: 30,
  INVALID_SESSION: 30,
  MALFORMED_MESSAGE: 20,
  COMMAND_FLOODING: 30,
  GRID_LOAD_ATTACK: 40  // Planned for future
};

// Command Flooding / Rate Limiting Configuration
const RATE_LIMIT_CONFIG = {
  WINDOW_MS: 10000,            // 10-second sliding window
  MAX_MESSAGES_PER_WINDOW: 50, // Max general messages allowed per window per charger
  MAX_RESETS_PER_WINDOW: 10,   // Max Reset requests allowed per window per charger
  COOLDOWN_MS: 15000           // Cool-down duration after flooding threshold exceeded
};

// Risk Severity Bands
const RISK_BANDS = {
  LOW: { min: 0, max: 30, label: 'LOW', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800' },
  MEDIUM: { min: 31, max: 60, label: 'MEDIUM', color: 'text-amber-400 bg-amber-950/40 border-amber-800' },
  HIGH: { min: 61, max: 80, label: 'HIGH', color: 'text-orange-400 bg-orange-950/40 border-orange-800' },
  CRITICAL: { min: 81, max: 100, label: 'CRITICAL', color: 'text-red-400 bg-red-950/40 border-red-800' }
};

// Security Actions
const SECURITY_ACTIONS = {
  ALLOW: 'ALLOW',
  BLOCK: 'BLOCK',
  ALERT: 'ALERT'
};

// Severity Rank hierarchy
const SEVERITY_LEVELS = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

// Decision Policy mapping severity band to default security action
const DECISION_POLICY = {
  LOW: SECURITY_ACTIONS.ALLOW,
  MEDIUM: SECURITY_ACTIONS.ALERT,
  HIGH: SECURITY_ACTIONS.BLOCK,
  CRITICAL: SECURITY_ACTIONS.BLOCK
};

// Detection Types
const DETECTION_TYPES = {
  NORMAL: 'Normal',
  UNAUTHORIZED_CHARGER: 'Unauthorized Charger',
  CHARGER_IMPERSONATION: 'Charger Impersonation',
  MALFORMED_OCPP: 'Malformed OCPP Message',
  INVALID_SESSION: 'Invalid Session',
  METER_ANOMALY: 'Meter Anomaly',
  METER_ROLLBACK: 'Meter Rollback',
  COMMAND_FLOODING: 'Command Flooding',
  GRID_LOAD_EXCEEDED: 'Grid Load Exceeded'
};

module.exports = {
  OCPP_MESSAGE_TYPE,
  REGISTERED_CHARGERS,
  RISK_WEIGHTS,
  RATE_LIMIT_CONFIG,
  RISK_BANDS,
  SECURITY_ACTIONS,
  SEVERITY_LEVELS,
  DECISION_POLICY,
  DETECTION_TYPES
};

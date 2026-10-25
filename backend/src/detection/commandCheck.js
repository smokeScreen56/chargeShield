/**
 * ChargeShield Command Flooding & Behavior Analysis Module (Stage 5)
 * Sliding-window rate limiter per charger ID (and per action type, especially Reset).
 * When limits are exceeded: logs "Command Flooding", HIGH severity, BLOCK.
 * Drops flood traffic during cool-down while suppressing spam to log ONE aggregated event.
 * Cleans up old timestamps to prevent memory leaks.
 * Ensures isolation between chargers.
 */

const { RATE_LIMIT_CONFIG, RISK_WEIGHTS, DETECTION_TYPES, SECURITY_ACTIONS } = require('../config/constants');

class CommandCheck {
  constructor() {
    // chargerId -> { generalTimestamps: number[], resetTimestamps: number[], cooldownUntil: number, floodCount: number, floodReported: boolean }
    this.chargers = new Map();
  }

  getChargerEntry(chargerId) {
    if (!this.chargers.has(chargerId)) {
      this.chargers.set(chargerId, {
        generalTimestamps: [],
        resetTimestamps: [],
        cooldownUntil: 0,
        floodCount: 0,
        floodReported: false
      });
    }
    return this.chargers.get(chargerId);
  }

  /**
   * Reset state for testing or charger disconnection
   */
  resetState(chargerId) {
    if (chargerId) {
      this.chargers.delete(chargerId);
    } else {
      this.chargers.clear();
    }
  }

  /**
   * Evaluate command rate limits for an incoming message
   * @param {Object} context - { chargerId, raw }
   * @returns {Object} - { passed, stage, detectionType, riskScore, severity, forcedAction, silent, reason }
   */
  evaluate(context) {
    const { chargerId, raw } = context;
    if (!chargerId) {
      return { passed: true, stage: 'Command Flooding', detectionType: DETECTION_TYPES.NORMAL, riskScore: 0 };
    }

    const action = Array.isArray(raw) ? raw[2] : (context.action || 'UNKNOWN');
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_CONFIG.WINDOW_MS;

    const entry = this.getChargerEntry(chargerId);

    // 1. Check if currently under active cool-down
    if (now < entry.cooldownUntil) {
      entry.floodCount++;
      return {
        passed: false,
        stage: 'Command Flooding',
        detectionType: DETECTION_TYPES.COMMAND_FLOODING,
        riskScore: RISK_WEIGHTS.COMMAND_FLOODING,
        severity: 'HIGH',
        forcedAction: SECURITY_ACTIONS.BLOCK,
        silent: true, // Drop during cool-down without spamming separate log events
        reason: `Command flooding active on '${chargerId}': request dropped during cool-down (total dropped: ${entry.floodCount}).`
      };
    }

    // Cool-down has passed or not active: reset cool-down state
    if (entry.cooldownUntil > 0 && now >= entry.cooldownUntil) {
      entry.cooldownUntil = 0;
      entry.floodCount = 0;
      entry.floodReported = false;
    }

    // 2. Prune old timestamps outside the sliding window
    entry.generalTimestamps = entry.generalTimestamps.filter(t => t > windowStart);
    entry.resetTimestamps = entry.resetTimestamps.filter(t => t > windowStart);

    // 3. Record new message timestamp
    entry.generalTimestamps.push(now);
    if (action === 'Reset') {
      entry.resetTimestamps.push(now);
    }

    // 4. Check Reset action limit
    if (action === 'Reset' && entry.resetTimestamps.length > RATE_LIMIT_CONFIG.MAX_RESETS_PER_WINDOW) {
      entry.cooldownUntil = now + RATE_LIMIT_CONFIG.COOLDOWN_MS;
      entry.floodCount = entry.resetTimestamps.length;
      entry.floodReported = true;

      return {
        passed: false,
        stage: 'Command Flooding',
        detectionType: DETECTION_TYPES.COMMAND_FLOODING,
        riskScore: RISK_WEIGHTS.COMMAND_FLOODING,
        severity: 'HIGH',
        forcedAction: SECURITY_ACTIONS.BLOCK,
        silent: false, // Log ONE aggregated event
        reason: `Command Flooding detected on '${chargerId}': ${entry.resetTimestamps.length} Reset commands in ${(RATE_LIMIT_CONFIG.WINDOW_MS / 1000).toFixed(0)}s (limit: ${RATE_LIMIT_CONFIG.MAX_RESETS_PER_WINDOW}). Entering cool-down.`
      };
    }

    // 5. Check General message rate limit
    if (entry.generalTimestamps.length > RATE_LIMIT_CONFIG.MAX_MESSAGES_PER_WINDOW) {
      entry.cooldownUntil = now + RATE_LIMIT_CONFIG.COOLDOWN_MS;
      entry.floodCount = entry.generalTimestamps.length;
      entry.floodReported = true;

      return {
        passed: false,
        stage: 'Command Flooding',
        detectionType: DETECTION_TYPES.COMMAND_FLOODING,
        riskScore: RISK_WEIGHTS.COMMAND_FLOODING,
        severity: 'HIGH',
        forcedAction: SECURITY_ACTIONS.BLOCK,
        silent: false, // Log ONE aggregated event
        reason: `Command Flooding detected on '${chargerId}': ${entry.generalTimestamps.length} messages in ${(RATE_LIMIT_CONFIG.WINDOW_MS / 1000).toFixed(0)}s (limit: ${RATE_LIMIT_CONFIG.MAX_MESSAGES_PER_WINDOW}). Entering cool-down.`
      };
    }

    return {
      passed: true,
      stage: 'Command Flooding',
      detectionType: DETECTION_TYPES.NORMAL,
      riskScore: 0,
      reason: `Message rate within limits (${entry.generalTimestamps.length}/${RATE_LIMIT_CONFIG.MAX_MESSAGES_PER_WINDOW} msgs, ${entry.resetTimestamps.length}/${RATE_LIMIT_CONFIG.MAX_RESETS_PER_WINDOW} resets in ${(RATE_LIMIT_CONFIG.WINDOW_MS / 1000).toFixed(0)}s).`
    };
  }
}

module.exports = new CommandCheck();

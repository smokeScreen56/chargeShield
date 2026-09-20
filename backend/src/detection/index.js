/**
 * ChargeShield Detection Pipeline Runner
 * Executes the complete detection sequence:
 * Identity Check -> OCPP Validation -> Session Check -> Physics Check -> Risk Engine -> Decision
 */

const identityCheck = require('./identityCheck');
const ocppValidation = require('./ocppValidation');
const sessionCheck = require('./sessionCheck');
const physicsCheck = require('./physicsCheck');
const riskEngine = require('./riskEngine');
const { SECURITY_ACTIONS } = require('../config/constants');

class DetectionPipeline {
  /**
   * Run full inspection on an incoming message
   * @param {Object} context - { raw, chargerId, clientIp, socketMeta }
   */
  async inspectMessage(context) {
    const { raw, chargerId, clientIp } = context;
    const [, uniqueId, action, payload] = Array.isArray(raw) ? raw : [null, null, 'UNKNOWN', {}];

    const pipelineSteps = [];

    // Stage 1: Identity Check
    const identityResult = identityCheck.evaluate(context);
    pipelineSteps.push({ stage: 'Identity Check', ...identityResult });

    // Stage 2: OCPP Validation
    const ocppResult = ocppValidation.evaluate(context);
    pipelineSteps.push({ stage: 'OCPP Validation', ...ocppResult });

    // Stage 3: Session Check
    const sessionResult = ocppResult.passed ? sessionCheck.evaluate(context) : { passed: true, riskScore: 0 };
    pipelineSteps.push({ stage: 'Session Check', ...sessionResult });

    // Stage 4: Physics & Meter Check
    const physicsResult = ocppResult.passed ? physicsCheck.evaluate(context) : { passed: true, riskScore: 0 };
    pipelineSteps.push({ stage: 'Physics Check', ...physicsResult });

    // Stage 5 & 6: Risk Scoring & Decision Engine
    const decision = riskEngine.computeScoreAndDecision([
      identityResult,
      ocppResult,
      sessionResult,
      physicsResult
    ]);

    // Update session state if message is successfully ALLOWED
    if (decision.action === SECURITY_ACTIONS.ALLOW && ocppResult.passed) {
      sessionCheck.updateSessionOnSuccess(chargerId, action, payload);
    }

    const evaluationResult = {
      timestamp: new Date(),
      chargerId: chargerId || 'UNKNOWN',
      messageType: action || 'UNKNOWN',
      uniqueId: uniqueId || '0',
      detectionType: decision.primaryDetection,
      riskScore: decision.riskScore,
      severity: decision.severity,
      action: decision.action,
      reason: decision.reasons.join(' | '),
      clientIp: clientIp || '127.0.0.1',
      payload: payload || {},
      pipelineSteps
    };

    return evaluationResult;
  }
}

module.exports = new DetectionPipeline();

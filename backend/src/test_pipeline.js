/**
 * Verification Test Script for ChargeShield Detection Pipeline
 */

const detectionPipeline = require('./detection');
const { SECURITY_ACTIONS, DETECTION_TYPES } = require('./config/constants');

async function runTests() {
  console.log('--- Starting ChargeShield Detection Tests ---');

  // Test 1: Normal BootNotification
  console.log('\n[Test 1] Normal BootNotification for CP001:');
  const t1 = await detectionPipeline.inspectMessage({
    chargerId: 'CP001',
    clientIp: '192.168.1.50',
    raw: [2, 'msg_001', 'BootNotification', { chargePointVendor: 'TestCorp', chargePointModel: 'VoltPro' }],
    socketMeta: { isDuplicate: false }
  });
  console.log(`Result: Action=${t1.action}, Risk=${t1.riskScore}, Detection=${t1.detectionType}`);
  console.assert(t1.action === SECURITY_ACTIONS.ALLOW, 'Test 1 Failed');

  // Test 2: Attack 1 - Charger Impersonation
  console.log('\n[Test 2] Attack 1: Charger Impersonation (Duplicate connection on CP001):');
  const t2 = await detectionPipeline.inspectMessage({
    chargerId: 'CP001',
    clientIp: '10.0.0.99',
    raw: [2, 'msg_002', 'Heartbeat', {}],
    socketMeta: { isDuplicate: true }
  });
  console.log(`Result: Action=${t2.action}, Risk=${t2.riskScore}, Detection=${t2.detectionType}`);
  console.assert(t2.action === SECURITY_ACTIONS.BLOCK, 'Test 2 Failed');
  console.assert(t2.detectionType === DETECTION_TYPES.CHARGER_IMPERSONATION, 'Test 2 Detection Mismatch');
  console.assert(t2.riskScore === 40, 'Test 2 Risk Score Mismatch');

  // Test 3: Unauthorized Charger (CP999)
  console.log('\n[Test 3] Unauthorized Charger (CP999):');
  const t3 = await detectionPipeline.inspectMessage({
    chargerId: 'CP999',
    clientIp: '10.0.0.99',
    raw: [2, 'msg_003', 'BootNotification', { chargePointVendor: 'HackerCorp', chargePointModel: 'BadBox' }],
    socketMeta: { isDuplicate: false }
  });
  console.log(`Result: Action=${t3.action}, Risk=${t3.riskScore}, Detection=${t3.detectionType}`);
  console.assert(t3.action === SECURITY_ACTIONS.BLOCK, 'Test 3 Failed');
  console.assert(t3.detectionType === DETECTION_TYPES.UNAUTHORIZED_CHARGER, 'Test 3 Detection Mismatch');
  console.assert(t3.riskScore === 40, 'Test 3 Risk Score Mismatch');

  // Test 4: Attack 2 - Fake Meter Reading (25 kW on CP001 rated 7.4 kW)
  console.log('\n[Test 4] Attack 2: Fake Meter Reading (25 kW on CP001 rated 7.4 kW):');
  // First start a transaction
  await detectionPipeline.inspectMessage({
    chargerId: 'CP001',
    clientIp: '192.168.1.50',
    raw: [2, 'msg_004_auth', 'Authorize', { idTag: 'RFID123' }],
    socketMeta: { isDuplicate: false }
  });
  await detectionPipeline.inspectMessage({
    chargerId: 'CP001',
    clientIp: '192.168.1.50',
    raw: [2, 'msg_004_start', 'StartTransaction', { connectorId: 1, idTag: 'RFID123', meterStart: 1000, timestamp: new Date().toISOString() }],
    socketMeta: { isDuplicate: false }
  });
  const t4 = await detectionPipeline.inspectMessage({
    chargerId: 'CP001',
    clientIp: '192.168.1.50',
    raw: [2, 'msg_004_meter', 'MeterValues', {
      connectorId: 1,
      transactionId: 1000,
      meterValue: [{
        timestamp: new Date().toISOString(),
        sampledValue: [{ value: '25000', measurand: 'Power.Active.Import', unit: 'W' }]
      }]
    }],
    socketMeta: { isDuplicate: false }
  });
  console.log(`Result: Action=${t4.action}, Risk=${t4.riskScore}, Detection=${t4.detectionType}`);
  console.assert(t4.action === SECURITY_ACTIONS.BLOCK, 'Test 4 Failed');
  console.assert(t4.detectionType === DETECTION_TYPES.METER_ANOMALY, 'Test 4 Detection Mismatch');
  console.assert(t4.riskScore === 30, 'Test 4 Risk Score Mismatch');

  // Test 5: Attack 3 - Invalid Session (StopTransaction on Idle Charger CP003)
  console.log('\n[Test 5] Attack 3: Invalid Session (StopTransaction on Idle CP003):');
  const t5 = await detectionPipeline.inspectMessage({
    chargerId: 'CP003',
    clientIp: '192.168.1.52',
    raw: [2, 'msg_005', 'StopTransaction', { transactionId: 9999, meterStop: 50000, timestamp: new Date().toISOString() }],
    socketMeta: { isDuplicate: false }
  });
  console.log(`Result: Action=${t5.action}, Risk=${t5.riskScore}, Detection=${t5.detectionType}`);
  console.assert(t5.action === SECURITY_ACTIONS.BLOCK, 'Test 5 Failed');
  console.assert(t5.detectionType === DETECTION_TYPES.INVALID_SESSION, 'Test 5 Detection Mismatch');
  console.assert(t5.riskScore === 30, 'Test 5 Risk Score Mismatch');

  // Test 6: RiskEngine Decision Policy & Severity Bands
  console.log('\n[Test 6] RiskEngine: Decision Policy & Bands (LOW, MEDIUM, HIGH, CRITICAL):');
  const riskEngine = require('./detection/riskEngine');

  // 6.1: LOW band (Score 20) -> ALLOW
  const decLow = riskEngine.computeScoreAndDecision([
    { passed: false, riskScore: 20, stage: 'CustomCheck', detectionType: 'MinorIssue' }
  ]);
  console.log(`6.1 LOW: Score=${decLow.riskScore}, Severity=${decLow.severity}, Action=${decLow.action}`);
  console.assert(decLow.riskScore === 20, '6.1 Score Mismatch');
  console.assert(decLow.severity === 'LOW', '6.1 Severity Mismatch');
  console.assert(decLow.action === SECURITY_ACTIONS.ALLOW, '6.1 Action Mismatch');

  // 6.2: MEDIUM band (Score 45) -> ALERT
  const decMed = riskEngine.computeScoreAndDecision([
    { passed: false, riskScore: 45, stage: 'CustomCheck', detectionType: 'MediumAnomaly' }
  ]);
  console.log(`6.2 MEDIUM: Score=${decMed.riskScore}, Severity=${decMed.severity}, Action=${decMed.action}`);
  console.assert(decMed.riskScore === 45, '6.2 Score Mismatch');
  console.assert(decMed.severity === 'MEDIUM', '6.2 Severity Mismatch');
  console.assert(decMed.action === SECURITY_ACTIONS.ALERT, '6.2 Action Mismatch');

  // 6.3: HIGH band (Score 70) -> BLOCK
  const decHigh = riskEngine.computeScoreAndDecision([
    { passed: false, riskScore: 70, stage: 'CustomCheck', detectionType: 'HighAnomaly' }
  ]);
  console.log(`6.3 HIGH: Score=${decHigh.riskScore}, Severity=${decHigh.severity}, Action=${decHigh.action}`);
  console.assert(decHigh.riskScore === 70, '6.3 Score Mismatch');
  console.assert(decHigh.severity === 'HIGH', '6.3 Severity Mismatch');
  console.assert(decHigh.action === SECURITY_ACTIONS.BLOCK, '6.3 Action Mismatch');

  // 6.4: CRITICAL band (Score 90) -> BLOCK
  const decCrit = riskEngine.computeScoreAndDecision([
    { passed: false, riskScore: 90, stage: 'CustomCheck', detectionType: 'SevereExploit' }
  ]);
  console.log(`6.4 CRITICAL: Score=${decCrit.riskScore}, Severity=${decCrit.severity}, Action=${decCrit.action}`);
  console.assert(decCrit.riskScore === 90, '6.4 Score Mismatch');
  console.assert(decCrit.severity === 'CRITICAL', '6.4 Severity Mismatch');
  console.assert(decCrit.action === SECURITY_ACTIONS.BLOCK, '6.4 Action Mismatch');

  // 6.5: Forced Action: Grid Overload (Forced ALERT with CRITICAL severity)
  const decGridForced = riskEngine.computeScoreAndDecision([
    { passed: false, riskScore: 40, stage: 'Grid Load Check', severity: 'CRITICAL', forcedAction: SECURITY_ACTIONS.ALERT, detectionType: 'Grid Load Exceeded' }
  ]);
  console.log(`6.5 Forced ALERT (CRITICAL): Score=${decGridForced.riskScore}, Severity=${decGridForced.severity}, Action=${decGridForced.action}`);
  console.assert(decGridForced.severity === 'CRITICAL', '6.5 Severity Mismatch');
  console.assert(decGridForced.action === SECURITY_ACTIONS.ALERT, '6.5 Forced Action Mismatch');

  // 6.6: Compounding Scores & Highest Severity Wins
  const decCompound = riskEngine.computeScoreAndDecision([
    { passed: false, riskScore: 25, stage: 'CheckA', severity: 'LOW' },
    { passed: false, riskScore: 40, stage: 'CheckB', severity: 'HIGH' }
  ]);
  console.log(`6.6 Compounding: Score=${decCompound.riskScore}, Severity=${decCompound.severity}, Action=${decCompound.action}`);
  console.assert(decCompound.riskScore === 65, '6.6 Score Sum Mismatch');
  console.assert(decCompound.severity === 'HIGH', '6.6 Severity Win Mismatch');
  console.assert(decCompound.action === SECURITY_ACTIONS.BLOCK, '6.6 Action Mismatch');

  console.log('\n🎉 ALL PIPELINE UNIT TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

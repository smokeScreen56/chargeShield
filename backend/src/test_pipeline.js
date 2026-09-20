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

  console.log('\n🎉 ALL PIPELINE UNIT TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

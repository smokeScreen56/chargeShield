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

  // Test 7: Stage 5 - Command Flooding & Rate Limiting
  console.log('\n[Test 7] Stage 5: Command Flooding (Under limit, Over limit, Cooldown, Isolation, Expiry):');
  const commandCheck = require('./detection/commandCheck');
  const { RATE_LIMIT_CONFIG } = require('./config/constants');
  commandCheck.resetState();

  // 7.1: Under limit (Send 5 Reset commands from CP001)
  console.log('7.1: Under limit...');
  for (let i = 0; i < 5; i++) {
    const res = await detectionPipeline.inspectMessage({
      chargerId: 'CP001',
      clientIp: '192.168.1.100',
      raw: [2, `reset_${i}`, 'Reset', { type: 'Soft' }]
    });
    console.assert(res.action === SECURITY_ACTIONS.ALLOW, `7.1 Message ${i} should be ALLOWED`);
  }
  console.log('  -> 5 Resets passed normally.');

  // 7.2: Over limit (Push until MAX_RESETS_PER_WINDOW is exceeded)
  console.log('7.2: Over limit...');
  let breachResult = null;
  for (let i = 5; i <= RATE_LIMIT_CONFIG.MAX_RESETS_PER_WINDOW + 2; i++) {
    const res = await detectionPipeline.inspectMessage({
      chargerId: 'CP001',
      clientIp: '192.168.1.100',
      raw: [2, `reset_${i}`, 'Reset', { type: 'Soft' }]
    });
    if (res.action === SECURITY_ACTIONS.BLOCK && !res.silent) {
      breachResult = res;
    }
  }
  console.assert(breachResult !== null, '7.2 Flooding breach event must be detected');
  console.assert(breachResult.detectionType === DETECTION_TYPES.COMMAND_FLOODING, '7.2 DetectionType mismatch');
  console.assert(breachResult.severity === 'HIGH', '7.2 Severity must be HIGH');
  console.assert(breachResult.action === SECURITY_ACTIONS.BLOCK, '7.2 Action must be BLOCK');
  console.assert(breachResult.silent === false, '7.2 Primary breach event must not be silent');
  console.log(`  -> Flooding breach detected: ${breachResult.reason}`);

  // 7.3: Subsequent messages during cooldown are dropped silently
  console.log('7.3: Cooldown dropping...');
  const dropRes = await detectionPipeline.inspectMessage({
    chargerId: 'CP001',
    clientIp: '192.168.1.100',
    raw: [2, 'reset_dropped', 'Reset', { type: 'Soft' }]
  });
  console.assert(dropRes.action === SECURITY_ACTIONS.BLOCK, '7.3 Dropped request must be BLOCKED');
  console.assert(dropRes.silent === true, '7.3 Dropped request must be marked silent');
  console.log('  -> Cooldown traffic dropped silently.');

  // 7.4: Per-Charger Isolation (CP002 should NOT be affected by CP001 flood)
  console.log('7.4: Per-charger isolation...');
  const cp2Res = await detectionPipeline.inspectMessage({
    chargerId: 'CP002',
    clientIp: '192.168.1.102',
    raw: [2, 'cp2_msg', 'Heartbeat', {}]
  });
  console.assert(cp2Res.action === SECURITY_ACTIONS.ALLOW, '7.4 CP002 should be ALLOWED despite CP001 flood');
  console.log('  -> CP002 unaffected by CP001 flood.');

  // 7.5: Window / Cooldown Expiry
  console.log('7.5: Window expiry...');
  // Artificially expire the cooldown on CP001
  const cp1Entry = commandCheck.getChargerEntry('CP001');
  cp1Entry.cooldownUntil = Date.now() - 1;
  cp1Entry.generalTimestamps = [];
  cp1Entry.resetTimestamps = [];

  const postExpiryRes = await detectionPipeline.inspectMessage({
    chargerId: 'CP001',
    clientIp: '192.168.1.100',
    raw: [2, 'reset_post_cooldown', 'Reset', { type: 'Soft' }]
  });
  console.assert(postExpiryRes.action === SECURITY_ACTIONS.ALLOW, '7.5 Request after cooldown must be ALLOWED');
  console.log('  -> Traffic resumed after window expiry.');

  // Test 8: Stage 6 - Grid Load Monitoring & Overload Protection
  console.log('\n[Test 8] Stage 6: Grid Load (Below warning, Warning band, Over capacity, Load drop after stop):');
  const gridCheck = require('./detection/gridCheck');
  const { GRID_CONFIG } = require('./config/constants');
  gridCheck.resetState();

  // Helper to start session for a charger cleanly
  const ensureChargingSession = async (chargerId, txId) => {
    await detectionPipeline.inspectMessage({
      chargerId,
      raw: [2, `auth_${chargerId}`, 'Authorize', { idTag: 'GRID_TEST_TAG' }]
    });
    await detectionPipeline.inspectMessage({
      chargerId,
      raw: [2, `start_${chargerId}`, 'StartTransaction', {
        connectorId: 1,
        idTag: 'GRID_TEST_TAG',
        meterStart: 500,
        timestamp: new Date().toISOString()
      }]
    });
  };

  await ensureChargingSession('CP001', 101);
  await ensureChargingSession('CP002', 102);
  await ensureChargingSession('CP003', 103);

  // 8.1: Below warning (CP001 reporting 7.0 kW -> total 7.0 kW < 28.0 kW warning)
  console.log('8.1: Below warning threshold...');
  const resBelow = await detectionPipeline.inspectMessage({
    chargerId: 'CP001',
    raw: [2, 'mv_cp1', 'MeterValues', {
      connectorId: 1,
      transactionId: 101,
      meterValue: [{
        timestamp: new Date().toISOString(),
        sampledValue: [
          { value: '7000', measurand: 'Power.Active.Import', unit: 'W' },
          { value: '1000', measurand: 'Energy.Active.Import.Register', unit: 'Wh' }
        ]
      }]
    }]
  });
  console.assert(resBelow.action === SECURITY_ACTIONS.ALLOW, '8.1 Expected ALLOW below warning');
  console.assert(resBelow.severity === 'LOW', '8.1 Expected LOW severity');
  console.log(`  -> Below warning passed: Load=${gridCheck.getGridStats().currentLoadKw} kW / ${GRID_CONFIG.GRID_CAPACITY_KW} kW`);

  // 8.2: Warning band (CP002 reporting 21.5 kW -> total 7.0 + 21.5 = 28.5 kW >= 28.0 kW and <= 35.0 kW)
  console.log('8.2: Warning band (>= 80%)...');
  const resWarning = await detectionPipeline.inspectMessage({
    chargerId: 'CP002',
    raw: [2, 'mv_cp2', 'MeterValues', {
      connectorId: 1,
      transactionId: 102,
      meterValue: [{
        timestamp: new Date().toISOString(),
        sampledValue: [
          { value: '21500', measurand: 'Power.Active.Import', unit: 'W' },
          { value: '2000', measurand: 'Energy.Active.Import.Register', unit: 'Wh' }
        ]
      }]
    }]
  });
  console.assert(resWarning.action === SECURITY_ACTIONS.ALERT, '8.2 Expected ALERT in warning band');
  console.assert(resWarning.severity === 'MEDIUM', '8.2 Expected MEDIUM severity in warning band');
  console.assert(resWarning.detectionType === DETECTION_TYPES.GRID_LOAD_WARNING, '8.2 DetectionType mismatch');
  console.log(`  -> Warning band triggered: Load=${gridCheck.getGridStats().currentLoadKw} kW (${gridCheck.getGridStats().utilizationPercent}%)`);

  // 8.3: Over capacity (CP003 reporting 10.0 kW -> total 7.0 + 21.5 + 10.0 = 38.5 kW > 35.0 kW capacity)
  console.log('8.3: Over capacity (> 100%)...');
  const resOverload = await detectionPipeline.inspectMessage({
    chargerId: 'CP003',
    raw: [2, 'mv_cp3', 'MeterValues', {
      connectorId: 1,
      transactionId: 103,
      meterValue: [{
        timestamp: new Date().toISOString(),
        sampledValue: [
          { value: '10000', measurand: 'Power.Active.Import', unit: 'W' },
          { value: '3000', measurand: 'Energy.Active.Import.Register', unit: 'Wh' }
        ]
      }]
    }]
  });
  console.assert(resOverload.action === SECURITY_ACTIONS.ALERT, '8.3 Expected ALERT for grid overload');
  console.assert(resOverload.severity === 'CRITICAL', '8.3 Expected CRITICAL severity for grid overload');
  console.assert(resOverload.detectionType === DETECTION_TYPES.GRID_LOAD_EXCEEDED, '8.3 DetectionType mismatch');
  console.log(`  -> Over capacity triggered: Load=${gridCheck.getGridStats().currentLoadKw} kW (${gridCheck.getGridStats().utilizationPercent}%)`);

  // 8.4: Load dropping after StopTransaction (StopTransaction on CP002 removes 21.5 kW)
  console.log('8.4: Load dropping after StopTransaction...');
  const stopRes = await detectionPipeline.inspectMessage({
    chargerId: 'CP002',
    raw: [2, 'stop_cp2', 'StopTransaction', {
      transactionId: 102,
      meterStop: 5000,
      timestamp: new Date().toISOString()
    }]
  });
  console.assert(stopRes.action === SECURITY_ACTIONS.ALLOW, '8.4 StopTransaction should be ALLOWED');
  const postStopStats = gridCheck.getGridStats();
  console.log(`  -> Post-stop load: ${postStopStats.currentLoadKw} kW (Dropped from 38.5 kW)`);
  console.assert(postStopStats.currentLoadKw === 17.0, `8.4 Expected 17.0 kW, got ${postStopStats.currentLoadKw}`);

  // 8.5: Load dropping on charger disconnect
  console.log('8.5: Load dropping on charger disconnect...');
  gridCheck.removeChargerPower('CP003');
  const finalStats = gridCheck.getGridStats();
  console.assert(finalStats.currentLoadKw === 7.0, `8.5 Expected 7.0 kW, got ${finalStats.currentLoadKw}`);
  console.log(`  -> Disconnect load: ${finalStats.currentLoadKw} kW`);

  // Test 9: Simulator Scenarios (Normal + Attacks 1-5) Run Twice Back-to-Back
  console.log('\n[Test 9] Simulator Scenarios: Running All Scenarios Twice Back-to-Back (Cleanup & Verdicts):');
  const http = require('http');
  const ocppGateway = require('./gateway/ocppGateway');
  const chargerSimulator = require('./simulator/chargerSimulator');

  const testServer = http.createServer();
  ocppGateway.init(testServer, detectionPipeline, () => {});

  testServer.on('upgrade', (request, socket, head) => {
    const pathname = request.url || '';
    if (pathname.startsWith('/ocpp')) {
      const parts = pathname.split('/').filter(Boolean);
      const chargerId = parts[1] || 'UNKNOWN';
      ocppGateway.wss.handleUpgrade(request, socket, head, (ws) => {
        ocppGateway.wss.emit('connection', ws, request, chargerId);
      });
    }
  });

  await new Promise((resolve) => testServer.listen(5002, resolve));
  chargerSimulator.setGatewayUrl('ws://localhost:5002/ocpp');

  for (let iteration = 1; iteration <= 2; iteration++) {
    console.log(`\n  >> Scenario Suite Iteration ${iteration} of 2...`);

    // 9.1: Normal Flow
    const sNormal = await chargerSimulator.runNormalFlow('CP001');
    console.log(`    [Normal Flow]: Expected=${sNormal.expectedVerdict}, Actual=${sNormal.actualVerdict}`);
    console.assert(sNormal.passed, `Iteration ${iteration} Normal Flow failed`);
    console.assert(sNormal.actualVerdict === 'ALLOW', `Iteration ${iteration} Normal Flow must be ALLOW`);

    // 9.2: Attack 1 - Charger Impersonation
    const sAtk1 = await chargerSimulator.runAttack1Impersonation('CP001');
    console.log(`    [Attack 1]: Expected=${sAtk1.expectedVerdict}, Actual=${sAtk1.actualVerdict}`);
    console.assert(sAtk1.passed, `Iteration ${iteration} Attack 1 failed`);
    console.assert(sAtk1.actualVerdict === 'BLOCK', `Iteration ${iteration} Attack 1 must be BLOCK`);

    // 9.3: Attack 2 - Fake Meter Reading
    const sAtk2 = await chargerSimulator.runAttack2FakeMeter('CP001', 25.0);
    console.log(`    [Attack 2]: Expected=${sAtk2.expectedVerdict}, Actual=${sAtk2.actualVerdict}`);
    console.assert(sAtk2.passed, `Iteration ${iteration} Attack 2 failed`);
    console.assert(sAtk2.actualVerdict === 'BLOCK', `Iteration ${iteration} Attack 2 must be BLOCK`);

    // 9.4: Attack 3 - Invalid Session
    const sAtk3 = await chargerSimulator.runAttack3InvalidSession('CP002');
    console.log(`    [Attack 3]: Expected=${sAtk3.expectedVerdict}, Actual=${sAtk3.actualVerdict}`);
    console.assert(sAtk3.passed, `Iteration ${iteration} Attack 3 failed`);
    console.assert(sAtk3.actualVerdict === 'BLOCK', `Iteration ${iteration} Attack 3 must be BLOCK`);

    // 9.5: Attack 4 - Command Flooding
    const sAtk4 = await chargerSimulator.runAttack4CommandFlooding('CP001', 40);
    console.log(`    [Attack 4]: Expected=${sAtk4.expectedVerdict}, Actual=${sAtk4.actualVerdict}`);
    console.assert(sAtk4.passed, `Iteration ${iteration} Attack 4 failed`);
    console.assert(sAtk4.actualVerdict === 'BLOCK', `Iteration ${iteration} Attack 4 must be BLOCK`);

    // 9.6: Attack 5 - Grid Load Attack
    const sAtk5 = await chargerSimulator.runAttack5GridLoad();
    console.log(`    [Attack 5]: Expected=${sAtk5.expectedVerdict}, Actual=${sAtk5.actualVerdict}`);
    console.assert(sAtk5.passed, `Iteration ${iteration} Attack 5 failed`);
    console.assert(sAtk5.actualVerdict === 'ALERT', `Iteration ${iteration} Attack 5 must be ALERT`);
  }

  console.log('  -> All scenarios passed identically across back-to-back runs!');

  // Test 10: Upstream CSMS Proxying and Conditional Forwarding
  console.log('\n[Test 10] Upstream CSMS Proxy: Verify Forwarding of ALLOWED/ALERTED and Blocking of Attacks:');
  const MockCsms = require('../scripts/mockCsms');
  const mockCsms = new MockCsms(5555);
  await mockCsms.start();

  ocppGateway.setCsmsUrl('ws://localhost:5555/ocpp');

  // 10.1: Normal Flow forwarding to CSMS
  console.log('10.1: Normal Flow forwarding to CSMS...');
  mockCsms.clear();
  const normalResult = await chargerSimulator.runNormalFlow('CP001');
  console.assert(normalResult.passed, '10.1 Normal flow should pass');
  const csmsFrames = mockCsms.getReceivedFrames('CP001');
  console.log(`  -> Frames received by upstream CSMS from CP001: ${csmsFrames.length}`);
  console.assert(csmsFrames.length > 0, '10.1 Upstream CSMS should receive forwarded allowed frames');
  const actionsReceived = csmsFrames.map(f => f.action);
  console.log(`  -> Actions received by CSMS: ${actionsReceived.join(', ')}`);
  console.assert(actionsReceived.includes('BootNotification'), 'CSMS should receive BootNotification');
  console.assert(actionsReceived.includes('Heartbeat'), 'CSMS should receive Heartbeat');
  console.assert(actionsReceived.includes('StartTransaction'), 'CSMS should receive StartTransaction');

  // 10.2: Attack frame blocked and NOT forwarded to CSMS
  console.log('10.2: Blocked attack frame must NEVER reach upstream CSMS...');
  mockCsms.clear();
  const attackResult = await chargerSimulator.runAttack2FakeMeter('CP002', 45.0);
  console.assert(attackResult.actualVerdict === 'BLOCK', '10.2 Attack 2 must be BLOCK');
  const attackFrames = mockCsms.getReceivedFrames('CP002');
  const fakeMeterFrames = attackFrames.filter(f => f.action === 'MeterValues');
  console.log(`  -> Fake MeterValues received by upstream CSMS: ${fakeMeterFrames.length}`);
  console.assert(fakeMeterFrames.length === 0, '10.2 Blocked fake MeterValues must NEVER reach upstream CSMS!');

  // 10.3: Disconnect cleanup of upstream socket
  console.log('10.3: Charger disconnect closes upstream connection...');
  await new Promise(r => setTimeout(r, 200));
  console.assert(!ocppGateway.upstreamSockets.has('CP001'), 'CP001 upstream socket should be cleaned up after disconnect');
  console.assert(!ocppGateway.upstreamSockets.has('CP002'), 'CP002 upstream socket should be cleaned up after disconnect');

  // Teardown Mock CSMS & reset gateway URL
  ocppGateway.setCsmsUrl(null);
  await mockCsms.stop();
  console.log('  -> Upstream CSMS proxy verification passed!');

  // Cleanup test server
  ocppGateway.close();
  await new Promise(r => testServer.close(r));

  // Test 11: MongoDB Persistence and In-Memory Fallback
  console.log('\n[Test 11] Persistence: In-Memory Fallback & MongoDB Survival Across Backend Restart:');
  const path = require('path');
  const fs = require('fs');
  const { spawn } = require('child_process');
  const {
    initDatabase,
    disconnectDatabase,
    saveEvent,
    getEvents,
    getStats,
    clearEvents,
    resetInMemoryStore
  } = require('./models/SecurityEvent');

  // 11.1: Fallback In-Memory Mode
  console.log('11.1: Testing In-Memory Fallback Mode (pagination, filters, clearing)...');
  await disconnectDatabase();
  resetInMemoryStore();

  const fbStats1 = await getStats();
  console.assert(fbStats1.isMongoConnected === false, '11.1 Must be in fallback mode');

  await saveEvent({
    chargerId: 'CP001',
    messageType: 'Authorize',
    detectionType: 'Normal',
    stage: 'Pipeline',
    riskScore: 0,
    severity: 'LOW',
    action: 'ALLOW'
  });
  await saveEvent({
    chargerId: 'CP001',
    messageType: 'MeterValues',
    detectionType: 'Meter Anomaly',
    stage: 'Stage 3 Physics',
    riskScore: 40,
    severity: 'MEDIUM',
    action: 'ALERT'
  });
  await saveEvent({
    chargerId: 'CP002',
    messageType: 'Reset',
    detectionType: 'Command Flooding',
    stage: 'Stage 5 Flood',
    riskScore: 60,
    severity: 'HIGH',
    action: 'BLOCK'
  });
  await saveEvent({
    chargerId: 'CP003',
    messageType: 'MeterValues',
    detectionType: 'Grid Overload',
    stage: 'Stage 6 Grid',
    riskScore: 70,
    severity: 'CRITICAL',
    action: 'ALERT',
    aggregatedCount: 5
  });

  // Verify pagination
  const page1 = await getEvents({ page: 1, limit: 2 });
  console.assert(page1.events.length === 2, `Expected 2 events on page 1, got ${page1.events.length}`);
  console.assert(page1.total === 4, `Expected 4 total events, got ${page1.total}`);
  console.assert(page1.totalPages === 2, `Expected 2 total pages, got ${page1.totalPages}`);

  // Verify severity filter
  const critEvents = await getEvents({ severity: 'CRITICAL' });
  console.assert(critEvents.events.length === 1, `Expected 1 CRITICAL event, got ${critEvents.events.length}`);
  console.assert(critEvents.events[0].detectionType === 'Grid Overload', 'Severity filter mismatch');

  // Verify clearing
  await clearEvents();
  const cleared = await getEvents();
  console.assert(cleared.total === 0, 'In-memory events should be 0 after clearEvents');
  console.log('  -> In-memory fallback mode verified!');

  // 11.2: MongoDB Mode & Restart Persistence
  console.log('11.2: Testing MongoDB Mode & Survival Across Backend Restart...');
  const testDbDir = path.join(__dirname, '../test_mongo_persistence');
  if (!fs.existsSync(testDbDir)) {
    fs.mkdirSync(testDbDir, { recursive: true });
  }

  const mongoPort = 27018;
  const mongodProc = spawn('mongod', ['--dbpath', testDbDir, '--port', String(mongoPort), '--bind_ip', '127.0.0.1'], {
    stdio: 'ignore',
    detached: false
  });

  // Wait for MongoDB to accept connections
  await new Promise(r => setTimeout(r, 2000));

  try {
    const mongoUri = `mongodb://127.0.0.1:${mongoPort}/chargeshield_test`;
    await initDatabase(mongoUri);

    const mongoStats = await getStats();
    console.assert(mongoStats.isMongoConnected === true, '11.2 MongoDB should be connected');
    console.log('  -> Connected to local MongoDB instance.');

    // Save event with all new fields
    await saveEvent({
      chargerId: 'CP_RESTART_TEST',
      messageType: 'MeterValues',
      detectionType: 'Grid Overload',
      stage: 'Stage 6 Grid',
      riskScore: 70,
      severity: 'CRITICAL',
      action: 'ALERT',
      aggregatedCount: 3,
      reason: 'Persistent test event'
    });

    console.log('  -> Saved test event to MongoDB with all fields (stage, severity, action, score, aggregatedCount).');

    // Simulate backend restart: disconnect from MongoDB and wipe in-memory cache
    console.log('  -> Simulating backend restart (disconnect mongoose + clear in-memory cache)...');
    await disconnectDatabase();
    resetInMemoryStore();

    // Verify in-memory is empty
    const duringRestart = await getEvents();
    console.assert(duringRestart.total === 0, 'During restart in-memory store should be empty');

    // Re-initialize database (as server bootstrap does on restart)
    await initDatabase(mongoUri);

    // Fetch persisted events from MongoDB
    const postRestart = await getEvents({ chargerId: 'CP_RESTART_TEST' });
    console.log(`  -> Retrieved ${postRestart.events.length} event(s) after restart.`);
    console.assert(postRestart.events.length === 1, 'Event must survive backend restart in Mongo mode');

    const recovered = postRestart.events[0];
    console.assert(recovered.chargerId === 'CP_RESTART_TEST', 'chargerId mismatch');
    console.assert(recovered.stage === 'Stage 6 Grid', 'stage mismatch');
    console.assert(recovered.severity === 'CRITICAL', 'severity mismatch');
    console.assert(recovered.action === 'ALERT', 'action mismatch');
    console.assert(recovered.riskScore === 70, 'riskScore mismatch');
    console.assert(recovered.aggregatedCount === 3, 'aggregatedCount mismatch');
    console.log('  -> Verified event survived restart with all fields intact!');

    // Test MongoDB clearEvents
    await clearEvents();
    const postClear = await getEvents();
    console.assert(postClear.total === 0, 'MongoDB events should be 0 after clearEvents');

    await disconnectDatabase();
    console.log('  -> MongoDB persistence test passed!');
  } finally {
    try {
      mongodProc.kill('SIGTERM');
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {}

    // Clean up temporary database directory
    try {
      fs.rmSync(testDbDir, { recursive: true, force: true });
    } catch (e) {}
  }

  console.log('\n🎉 ALL PIPELINE UNIT TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

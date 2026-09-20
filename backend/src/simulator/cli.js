#!/usr/bin/env node
/**
 * ChargeShield EV Charger & Attack CLI Simulator
 * Simulates genuine physical EV chargers sending OCPP 1.6J WebSocket frames
 */

const readline = require('readline');
const chargerSimulator = require('./chargerSimulator');

const GATEWAY_URL = process.env.GATEWAY_URL || 'ws://localhost:5000/ocpp';
chargerSimulator.setGatewayUrl(GATEWAY_URL);

async function runScenario(scenario) {
  console.log(`\n===============================================================`);
  console.log(`📡 Connecting to ChargeShield Gateway at: ${GATEWAY_URL}`);
  console.log(`===============================================================`);

  switch (scenario) {
    case 'normal':
    case '1':
      console.log(`▶️  Executing: Normal Charging Session Cycle (CP001)`);
      console.log(`   Flow: BootNotification -> Heartbeat -> Authorize -> StartTransaction -> MeterValues -> StopTransaction\n`);
      const normRes = await chargerSimulator.runNormalFlow('CP001');
      console.log(`\n✅ Session Cycle Completed. Expected: ALLOWED (Risk 0)`);
      break;

    case 'attack1':
    case '2':
      console.log(`▶️  Executing Attack Scenario 1: Charger Impersonation`);
      console.log(`   Description: Rogue client connects claiming active charger ID 'CP001'\n`);
      const att1 = await chargerSimulator.runAttack1Impersonation('CP001');
      console.log(`\n🚨 Result:`, att1.blocked ? '⛔ BLOCKED by Gateway' : 'ALLOWED');
      console.log(`   Detection:`, att1.response?.[4]?.detectionType || 'SecurityError');
      console.log(`   Risk Score: +${att1.response?.[4]?.riskScore || 40}`);
      break;

    case 'attack2':
    case '3':
      console.log(`▶️  Executing Attack Scenario 2: Fake Meter Reading (Physical Anomaly)`);
      console.log(`   Description: CP001 (rated 7.4 kW capacity) reports impossible power: 25.0 kW\n`);
      const att2 = await chargerSimulator.runAttack2FakeMeter('CP001', 25.0);
      console.log(`\n🚨 Result:`, att2.blocked ? '⛔ BLOCKED by Gateway' : 'ALLOWED');
      console.log(`   Detection:`, att2.result?.response?.[4]?.detectionType || 'Meter Anomaly');
      console.log(`   Risk Score: +${att2.result?.response?.[4]?.riskScore || 30}`);
      break;

    case 'attack3':
    case '4':
      console.log(`▶️  Executing Attack Scenario 3: Invalid Session Sequence`);
      console.log(`   Description: Sending StopTransaction on idle CP002 without an active charging session\n`);
      const att3 = await chargerSimulator.runAttack3InvalidSession('CP002');
      console.log(`\n🚨 Result:`, att3.blocked ? '⛔ BLOCKED by Gateway' : 'ALLOWED');
      console.log(`   Detection:`, att3.result?.response?.[4]?.detectionType || 'Invalid Session');
      console.log(`   Risk Score: +${att3.result?.response?.[4]?.riskScore || 30}`);
      break;

    case 'unauthorized':
    case '5':
      console.log(`▶️  Executing Attack: Rogue / Unauthorized Charger (CP999)`);
      console.log(`   Description: Unregistered charger ID 'CP999' attempts BootNotification\n`);
      const unauth = await chargerSimulator.runAttackUnauthorizedCharger('CP999');
      console.log(`\n🚨 Result:`, unauth.success ? 'ALLOWED' : '⛔ BLOCKED by Gateway');
      break;

    default:
      console.log(`❌ Unknown scenario: '${scenario}'. Use normal, attack1, attack2, attack3, or unauthorized.`);
      break;
  }
}

async function showInteractiveMenu() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║          🛡️  ChargeShield - Live EV Charger & Attack CLI  🛡️              ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  [1] Normal Charging Flow (CP001: Boot -> Auth -> Start -> Meter -> Stop) ║
║  [2] Attack 1: Charger Impersonation (Rogue socket steals CP001 identity) ║
║  [3] Attack 2: Fake Meter Reading (Reports 25.0 kW on 7.4 kW rated CP001)║
║  [4] Attack 3: Invalid Session (StopTransaction on Idle CP002)           ║
║  [5] Unauthorized Charger (Unregistered CP999 connects)                  ║
║  [0] Exit                                                                ║
╚═══════════════════════════════════════════════════════════════════════════╝
  `);

  rl.question('Select a scenario to execute (1-5): ', async (choice) => {
    rl.close();
    if (choice === '0') {
      process.exit(0);
    }
    await runScenario(choice.trim());
    process.exit(0);
  });
}

const arg = process.argv[2];
if (arg) {
  runScenario(arg.toLowerCase()).then(() => process.exit(0));
} else {
  showInteractiveMenu();
}

/**
 * ChargeShield Manual Message Sender
 * Sends a single, explicit OCPP 1.6J JSON frame to the gateway
 *
 * Usage:
 *   node src/send.js <chargerId> <action> [extraParam]
 *
 * Examples:
 *   node src/send.js CP001 BootNotification
 *   node src/send.js CP001 Heartbeat
 *   node src/send.js CP001 Authorize
 *   node src/send.js CP001 StartTransaction
 *   node src/send.js CP001 MeterValues 7.2     (Normal: 7.2 kW)
 *   node src/send.js CP001 MeterValues 25.0    (Attack: 25 kW on 7.4 kW charger)
 *   node src/send.js CP002 StopTransaction     (Attack: Stop on idle charger)
 *   node src/send.js CP999 BootNotification    (Attack: Unauthorized charger)
 */

const { WebSocket } = require('ws');

const chargerId = process.argv[2] || 'CP001';
const action = process.argv[3] || 'Heartbeat';
const extraParam = process.argv[4];

const GATEWAY_URL = `ws://localhost:5000/ocpp/${chargerId}`;

function buildPayload(action, param) {
  switch (action) {
    case 'BootNotification':
      return {
        chargePointVendor: 'Alfen',
        chargePointModel: 'Eve Single Pro',
        chargePointSerialNumber: `${chargerId}-1001`,
        firmwareVersion: '1.0.0'
      };

    case 'Heartbeat':
      return {};

    case 'Authorize':
      return {
        idTag: param || 'RFID_TAG_001'
      };

    case 'StartTransaction':
      return {
        connectorId: 1,
        idTag: 'RFID_TAG_001',
        meterStart: 1000,
        timestamp: new Date().toISOString()
      };

    case 'MeterValues':
      const powerKw = parseFloat(param) || 7.2;
      return {
        connectorId: 1,
        transactionId: 1001,
        meterValue: [
          {
            timestamp: new Date().toISOString(),
            sampledValue: [
              {
                value: (powerKw * 1000).toString(),
                measurand: 'Power.Active.Import',
                unit: 'W'
              },
              {
                value: '15000',
                measurand: 'Energy.Active.Import.Register',
                unit: 'Wh'
              }
            ]
          }
        ]
      };

    case 'StopTransaction':
      return {
        transactionId: parseInt(param, 10) || 1001,
        meterStop: 1200,
        timestamp: new Date().toISOString()
      };

    case 'Reset':
      return {
        type: 'Hard'
      };

    default:
      return {};
  }
}

async function sendManualMessage() {
  const ws = new WebSocket(GATEWAY_URL);

  ws.on('open', () => {
    const messageId = `msg_${Date.now()}`;
    const payload = buildPayload(action, extraParam);

    // OCPP 1.6J CALL Frame format: [2, "<UniqueId>", "<Action>", {<Payload>}]
    const frame = [2, messageId, action, payload];

    console.log(`\n======================================================`);
    console.log(`🔌 Connected as: ${chargerId}`);
    console.log(`📤 Sending OCPP 1.6J Frame:`);
    console.log(JSON.stringify(frame, null, 2));
    console.log(`======================================================`);

    ws.send(JSON.stringify(frame));
  });

  ws.on('message', (data) => {
    const resp = JSON.parse(data.toString());
    console.log(`\n📥 Gateway Response:`);
    console.log(JSON.stringify(resp, null, 2));

    if (resp[0] === 3) {
      console.log(`\n✅ Result: ALLOWED (CallResult)`);
    } else if (resp[0] === 4) {
      console.log(`\n⛔ Result: BLOCKED (CallError - ${resp[2]}: ${resp[3]})`);
    }

    ws.close();
    process.exit(0);
  });

  ws.on('error', (err) => {
    console.error(`❌ Connection error:`, err.message);
    process.exit(1);
  });
}

sendManualMessage();

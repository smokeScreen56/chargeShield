/**
 * ChargeShield EV Charger Simulator
 * Simulates physical chargers (CP001, CP002, CP003) & Attack scenarios
 */

const { WebSocket } = require('ws');
const { OCPP_MESSAGE_TYPE } = require('../config/constants');

class ChargerSimulator {
  constructor(gatewayWsUrl = 'ws://localhost:5000/ocpp') {
    this.gatewayWsUrl = gatewayWsUrl;
    this.activeSimulators = new Map(); // chargerId -> ws
  }

  setGatewayUrl(url) {
    this.gatewayWsUrl = url;
  }

  /**
   * Helper to generate a unique OCPP message ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }

  /**
   * Connect a simulated charger to the ChargeShield gateway
   */
  async connectCharger(chargerId) {
    return new Promise((resolve, reject) => {
      const url = `${this.gatewayWsUrl}/${chargerId}`;
      const ws = new WebSocket(url);

      const timeout = setTimeout(() => {
        resolve({ success: false, message: 'Connection timed out' });
      }, 4000);

      ws.on('open', () => {
        clearTimeout(timeout);
        this.activeSimulators.set(chargerId, ws);
        console.log(`[Simulator] Simulated Charger '${chargerId}' connected to ${url}`);
        resolve({ success: true, chargerId, ws });
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        console.error(`[Simulator] Error connecting '${chargerId}':`, err.message);
        resolve({ success: false, error: err.message });
      });

      ws.on('message', (data) => {
        try {
          const response = JSON.parse(data.toString());
          console.log(`[Simulator] Charger '${chargerId}' received OCPP response:`, response);
        } catch (e) {
          console.log(`[Simulator] Charger '${chargerId}' received raw response:`, data.toString());
        }
      });
    });
  }

  /**
   * Send an OCPP 1.6J formatted message
   */
  async sendMessage(chargerId, action, payload = {}) {
    let ws = this.activeSimulators.get(chargerId);

    // Auto-connect if not connected
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      const conn = await this.connectCharger(chargerId);
      if (!conn.success) {
        return { success: false, error: `Failed to connect charger ${chargerId}` };
      }
      ws = this.activeSimulators.get(chargerId);
    }

    const messageId = this.generateMessageId();
    const ocppFrame = [
      OCPP_MESSAGE_TYPE.CALL,
      messageId,
      action,
      payload
    ];

    return new Promise((resolve) => {
      const onMessage = (data) => {
        try {
          const resp = JSON.parse(data.toString());
          if (resp[1] === messageId) {
            ws.removeListener('message', onMessage);
            resolve({
              success: resp[0] === OCPP_MESSAGE_TYPE.CALL_RESULT,
              messageId,
              action,
              response: resp
            });
          }
        } catch (e) {
          // ignore
        }
      };

      ws.on('message', onMessage);

      // Timeout fallback
      setTimeout(() => {
        ws.removeListener('message', onMessage);
        resolve({ success: false, messageId, action, message: 'No response or timed out' });
      }, 3000);

      ws.send(JSON.stringify(ocppFrame));
    });
  }

  /**
   * Scenario: Normal BootNotification
   */
  async sendBootNotification(chargerId = 'CP001') {
    return this.sendMessage(chargerId, 'BootNotification', {
      chargePointVendor: 'ChargeShield Sim Corp',
      chargePointModel: 'CS-VoltPro-2026',
      chargePointSerialNumber: `${chargerId}-SN9872`,
      firmwareVersion: 'v1.4.2'
    });
  }

  /**
   * Scenario: Normal Heartbeat
   */
  async sendHeartbeat(chargerId = 'CP001') {
    return this.sendMessage(chargerId, 'Heartbeat', {});
  }

  /**
   * Scenario: Normal Authorize (RFID Card)
   */
  async sendAuthorize(chargerId = 'CP001', idTag = 'RFID_TAG_9981') {
    return this.sendMessage(chargerId, 'Authorize', {
      idTag: idTag
    });
  }

  /**
   * Scenario: Normal StartTransaction
   */
  async sendStartTransaction(chargerId = 'CP001', connectorId = 1, idTag = 'RFID_TAG_9981', meterStart = 1000) {
    return this.sendMessage(chargerId, 'StartTransaction', {
      connectorId: connectorId,
      idTag: idTag,
      meterStart: meterStart,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Scenario: Send MeterValues (Power in kW, Energy in Wh/kWh)
   */
  async sendMeterValues(chargerId = 'CP001', transactionId = 1001, powerKw = 7.2, energyKwh = 10.5) {
    return this.sendMessage(chargerId, 'MeterValues', {
      connectorId: 1,
      transactionId: transactionId,
      meterValue: [
        {
          timestamp: new Date().toISOString(),
          sampledValue: [
            {
              value: (powerKw * 1000).toFixed(0), // Watts
              measurand: 'Power.Active.Import',
              unit: 'W'
            },
            {
              value: (energyKwh * 1000).toFixed(0), // Wh
              measurand: 'Energy.Active.Import.Register',
              unit: 'Wh'
            }
          ]
        }
      ]
    });
  }

  /**
   * Scenario: Normal StopTransaction
   */
  async sendStopTransaction(chargerId = 'CP001', transactionId = 1001, meterStop = 1150) {
    return this.sendMessage(chargerId, 'StopTransaction', {
      transactionId: transactionId,
      meterStop: meterStop,
      timestamp: new Date().toISOString(),
      reason: 'EVDisconnected'
    });
  }

  /**
   * 🌟 Complete Normal Charging Session Flow
   */
  async runNormalFlow(chargerId = 'CP001') {
    console.log(`[Simulator] Starting Normal Charging Flow for ${chargerId}...`);
    const results = [];

    // 1. BootNotification
    results.push(await this.sendBootNotification(chargerId));
    await new Promise(r => setTimeout(r, 600));

    // 2. Heartbeat
    results.push(await this.sendHeartbeat(chargerId));
    await new Promise(r => setTimeout(r, 600));

    // 3. Authorize
    results.push(await this.sendAuthorize(chargerId));
    await new Promise(r => setTimeout(r, 600));

    // 4. StartTransaction
    const startRes = await this.sendStartTransaction(chargerId, 1, 'RFID_TAG_9981', 10000);
    results.push(startRes);
    const txId = (startRes.response && startRes.response[2] && startRes.response[2].transactionId) || 1001;
    await new Promise(r => setTimeout(r, 600));

    // 5. MeterValues (Normal power: 6.8 kW for CP001 rated 7.4 kW)
    results.push(await this.sendMeterValues(chargerId, txId, 6.8, 10.8));
    await new Promise(r => setTimeout(r, 600));

    // 6. StopTransaction
    results.push(await this.sendStopTransaction(chargerId, txId, 11200));

    return { success: true, scenario: 'Normal Charging Flow', results };
  }

  /**
   * 🚨 Attack Scenario 1: Charger Impersonation
   * Opens a 2nd connection claiming identity of already active charger CP001
   */
  async runAttack1Impersonation(targetCharger = 'CP001') {
    console.log(`[Simulator] 🚨 Simulating Attack 1: Charger Impersonation on ${targetCharger}`);

    // Ensure first legitimate connection exists
    await this.connectCharger(targetCharger);
    await new Promise(r => setTimeout(r, 400));

    // Open rogue second socket with same charger ID
    const rogueUrl = `${this.gatewayWsUrl}/${targetCharger}`;
    const rogueWs = new WebSocket(rogueUrl);

    return new Promise((resolve) => {
      rogueWs.on('open', () => {
        const messageId = this.generateMessageId();
        const ocppFrame = [
          OCPP_MESSAGE_TYPE.CALL,
          messageId,
          'Heartbeat',
          { rogueAttempt: true }
        ];

        rogueWs.on('message', (data) => {
          try {
            const resp = JSON.parse(data.toString());
            rogueWs.close();
            resolve({
              scenario: 'Attack 1 - Charger Impersonation',
              chargerId: targetCharger,
              blocked: resp[0] === OCPP_MESSAGE_TYPE.CALL_ERROR,
              response: resp
            });
          } catch (e) {
            rogueWs.close();
            resolve({ scenario: 'Attack 1', error: data.toString() });
          }
        });

        rogueWs.send(JSON.stringify(ocppFrame));
      });

      rogueWs.on('error', (err) => {
        resolve({ scenario: 'Attack 1', error: err.message });
      });
    });
  }

  /**
   * 🚨 Attack Scenario 2: Fake Meter Reading (Physical Anomaly)
   * CP001 is rated 7.4 kW. Attacker sends 25.0 kW active power.
   */
  async runAttack2FakeMeter(chargerId = 'CP001', reportedPowerKw = 25.0) {
    console.log(`[Simulator] 🚨 Simulating Attack 2: Fake Meter Reading (${reportedPowerKw} kW on ${chargerId})`);

    // Ensure session is active first
    await this.sendAuthorize(chargerId);
    const startRes = await this.sendStartTransaction(chargerId, 1, 'ATTACK_CARD_01', 5000);
    const txId = (startRes.response && startRes.response[2] && startRes.response[2].transactionId) || 8888;
    await new Promise(r => setTimeout(r, 400));

    // Send impossible meter reading (25 kW on a 7.4 kW rated charger)
    const result = await this.sendMeterValues(chargerId, txId, reportedPowerKw, 50.0);

    return {
      scenario: 'Attack 2 - Fake Meter Reading',
      chargerId,
      reportedPowerKw,
      ratedCapacity: '7.4 kW',
      blocked: result.response && result.response[0] === OCPP_MESSAGE_TYPE.CALL_ERROR,
      result
    };
  }

  /**
   * 🚨 Attack Scenario 3: Invalid Session Sequence
   * Attacker sends StopTransaction while charger is IDLE (no active transaction).
   */
  async runAttack3InvalidSession(chargerId = 'CP002') {
    console.log(`[Simulator] 🚨 Simulating Attack 3: Invalid Session (StopTransaction on idle ${chargerId})`);

    // Directly send StopTransaction without StartTransaction
    const result = await this.sendMessage(chargerId, 'StopTransaction', {
      transactionId: 99999,
      meterStop: 50000,
      timestamp: new Date().toISOString(),
      reason: 'Remote'
    });

    return {
      scenario: 'Attack 3 - Invalid Session',
      chargerId,
      blocked: result.response && result.response[0] === OCPP_MESSAGE_TYPE.CALL_ERROR,
      result
    };
  }

  /**
   * 🚨 Attack: Unauthorized Charger Connection (CP999)
   */
  async runAttackUnauthorizedCharger(rogueId = 'CP999') {
    console.log(`[Simulator] 🚨 Simulating Unauthorized Charger: ${rogueId}`);
    return this.sendBootNotification(rogueId);
  }
}

module.exports = new ChargerSimulator();

/**
 * ChargeShield OCPP 1.6J Security Gateway
 * Intercepts WebSocket connections and OCPP JSON messages from EV chargers.
 */

const { WebSocketServer, WebSocket } = require('ws');
const { OCPP_MESSAGE_TYPE, SECURITY_ACTIONS } = require('../config/constants');

class OcppGateway {
  constructor() {
    this.wss = null;
    this.activeSockets = new Map(); // chargerId -> { socket, ip, connectedAt, connectionId }
    this.pipelineRunner = null;
    this.onSecurityEventCallback = null;
  }

  /**
   * Initialize Gateway WebSocket Server
   * @param {http.Server} server - Existing HTTP server to attach to or standalone port
   */
  init(server, pipelineRunner, onSecurityEventCallback) {
    this.pipelineRunner = pipelineRunner;
    this.onSecurityEventCallback = onSecurityEventCallback;

    this.wss = new WebSocketServer({
      noServer: true
    });

    this.wss.on('connection', (ws, req, chargerId) => {
      const clientIp = req.socket.remoteAddress || '127.0.0.1';
      const connectionId = `${chargerId}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

      // Attach metadata to socket
      ws.chargerId = chargerId;
      ws.clientIp = clientIp;
      ws.connectionId = connectionId;

      console.log(`[Gateway] Charger '${chargerId}' connected from ${clientIp} (ID: ${connectionId})`);

      // Store socket tracking
      const existing = this.activeSockets.get(chargerId);
      const isDuplicate = existing && existing.socket && existing.socket.readyState === WebSocket.OPEN && existing.connectionId !== connectionId;

      if (isDuplicate) {
        ws.isDuplicate = true;
      } else {
        ws.isDuplicate = false;
        this.activeSockets.set(chargerId, {
          socket: ws,
          ip: clientIp,
          connectedAt: new Date(),
          connectionId: connectionId
        });
      }

      ws.on('message', async (data) => {
        // Re-check duplicate state dynamically in case primary socket changed
        const currentActive = this.activeSockets.get(chargerId);
        const dynamicDuplicate = currentActive && currentActive.connectionId !== connectionId && currentActive.socket.readyState === WebSocket.OPEN;
        ws.isDuplicate = ws.isDuplicate || dynamicDuplicate;

        await this.handleIncomingMessage(ws, data);
      });

      ws.on('close', (code, reason) => {
        console.log(`[Gateway] Charger '${chargerId}' disconnected (code: ${code})`);
        const current = this.activeSockets.get(chargerId);
        if (current && current.connectionId === connectionId) {
          this.activeSockets.delete(chargerId);
        }
      });

      ws.on('error', (err) => {
        console.error(`[Gateway] Error on connection '${chargerId}':`, err.message);
      });
    });

    console.log('[Gateway] OCPP 1.6J WebSocket Gateway initialized.');
  }

  /**
   * Handle incoming raw message from an EV charger
   */
  async handleIncomingMessage(ws, rawData) {
    let parsedMessage = null;
    let messageString = rawData.toString();

    try {
      parsedMessage = JSON.parse(messageString);
    } catch (parseError) {
      console.warn(`[Gateway] Invalid JSON received from '${ws.chargerId}': ${messageString}`);
      const securityResult = {
        chargerId: ws.chargerId,
        messageType: 'UNKNOWN_MALFORMED',
        action: SECURITY_ACTIONS.BLOCK,
        detectionType: 'Malformed OCPP Message',
        riskScore: 20,
        severity: 'LOW',
        reason: 'Malformed JSON payload: failed to parse.',
        timestamp: new Date()
      };

      if (this.onSecurityEventCallback) {
        this.onSecurityEventCallback(securityResult);
      }

      ws.send(JSON.stringify([
        OCPP_MESSAGE_TYPE.CALL_ERROR,
        "0",
        "FormationViolation",
        "Payload is not valid JSON",
        {}
      ]));
      return;
    }

    // Process parsed message through ChargeShield detection pipeline
    if (this.pipelineRunner) {
      const evaluation = await this.pipelineRunner.inspectMessage({
        raw: parsedMessage,
        chargerId: ws.chargerId,
        clientIp: ws.clientIp,
        socketMeta: {
          isDuplicate: ws.isDuplicate,
          connectionId: ws.connectionId
        }
      });

      // Dispatch security event to callback (Database & Dashboard)
      if (this.onSecurityEventCallback) {
        this.onSecurityEventCallback(evaluation);
      }

      const [messageTypeId, uniqueId, actionName, payload] = parsedMessage;

      if (evaluation.action === SECURITY_ACTIONS.BLOCK) {
        console.warn(`[Gateway] ⛔ BLOCKED message [${actionName}] from ${ws.chargerId}: ${evaluation.reason} (Risk: ${evaluation.riskScore})`);

        // Send OCPP 1.6 CallError
        if (ws.readyState === WebSocket.OPEN) {
          const errorResponse = [
            OCPP_MESSAGE_TYPE.CALL_ERROR,
            uniqueId || "0",
            "SecurityError",
            evaluation.reason || "Message blocked by ChargeShield Security Gateway",
            {
              detectionType: evaluation.detectionType,
              riskScore: evaluation.riskScore,
              severity: evaluation.severity
            }
          ];
          ws.send(JSON.stringify(errorResponse));
        }
        return;
      }

      // If ALLOW or ALERT, produce valid OCPP response (acting as the Central System/CSMS backend)
      console.log(`[Gateway] ✅ ALLOWED message [${actionName}] from ${ws.chargerId} (Risk: ${evaluation.riskScore})`);
      const backendResponse = this.generateOcppCallResult(actionName, uniqueId, payload);
      if (ws.readyState === WebSocket.OPEN && backendResponse) {
        ws.send(JSON.stringify(backendResponse));
      }
    }
  }

  /**
   * Generates standard OCPP 1.6J CallResult responses for normal messages
   */
  generateOcppCallResult(action, uniqueId, payload) {
    let resultPayload = {};

    switch (action) {
      case 'BootNotification':
        resultPayload = {
          status: 'Accepted',
          currentTime: new Date().toISOString(),
          interval: 300
        };
        break;

      case 'Heartbeat':
        resultPayload = {
          currentTime: new Date().toISOString()
        };
        break;

      case 'Authorize':
        resultPayload = {
          idTagInfo: {
            status: 'Accepted',
            expiryDate: new Date(Date.now() + 86400000).toISOString()
          }
        };
        break;

      case 'StartTransaction':
        resultPayload = {
          transactionId: Math.floor(Math.random() * 90000) + 10000,
          idTagInfo: {
            status: 'Accepted',
            expiryDate: new Date(Date.now() + 86400000).toISOString()
          }
        };
        break;

      case 'MeterValues':
        resultPayload = {};
        break;

      case 'StopTransaction':
        resultPayload = {
          idTagInfo: {
            status: 'Accepted'
          }
        };
        break;

      case 'Reset':
        resultPayload = {
          status: 'Accepted'
        };
        break;

      default:
        resultPayload = { status: 'Accepted' };
        break;
    }

    return [
      OCPP_MESSAGE_TYPE.CALL_RESULT,
      uniqueId,
      resultPayload
    ];
  }

  /**
   * Get list of currently connected chargers
   */
  getConnectedChargers() {
    const list = [];
    for (const [chargerId, info] of this.activeSockets.entries()) {
      if (info.socket.readyState === WebSocket.OPEN) {
        list.push({
          chargerId,
          ip: info.ip,
          connectedAt: info.connectedAt
        });
      }
    }
    return list;
  }
}

module.exports = new OcppGateway();

/**
 * ChargeShield Mock Central System / CSMS (Charging Station Management System)
 * Acts as an upstream OCPP 1.6J Central System to verify gateway proxy forwarding.
 * Records all received frames to prove allowed traffic reaches upstream and blocked traffic does not.
 */

const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const { OCPP_MESSAGE_TYPE } = require('../src/config/constants');

class MockCsms {
  constructor(port = 5500) {
    this.port = port;
    this.server = null;
    this.wss = null;
    this.receivedFrames = []; // [{ timestamp, chargerId, raw, action, uniqueId }]
    this.connectedClients = new Map(); // chargerId -> ws
  }

  start() {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        const url = new URL(req.url, `http://${req.headers.host}`);

        // Health check endpoint
        if (url.pathname === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ status: 'ok', port: this.port }));
        }

        // Query received messages (used by test suites)
        if (url.pathname === '/received') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            count: this.receivedFrames.length,
            frames: this.receivedFrames
          }));
        }

        // Clear recorded messages
        if (url.pathname === '/clear') {
          this.receivedFrames = [];
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, message: 'Cleared' }));
        }

        res.writeHead(404);
        res.end();
      });

      this.wss = new WebSocketServer({ noServer: true });

      this.server.on('upgrade', (request, socket, head) => {
        const pathname = request.url || '';
        const parts = pathname.split('/').filter(Boolean);
        const chargerId = parts[parts.length - 1] || 'UNKNOWN';

        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request, chargerId);
        });
      });

      this.wss.on('connection', (ws, req, chargerId) => {
        this.connectedClients.set(chargerId, ws);
        console.log(`[Mock CSMS] Charger/Gateway connected for '${chargerId}'`);

        ws.on('message', (data) => {
          try {
            const parsed = JSON.parse(data.toString());
            const [messageType, uniqueId, action, payload] = parsed;

            // Record incoming frame
            this.receivedFrames.push({
              timestamp: new Date(),
              chargerId,
              messageType,
              uniqueId,
              action,
              payload
            });

            console.log(`[Mock CSMS] Received from '${chargerId}': [${action}] (${uniqueId})`);

            // If it's a CALL frame, send standard OCPP 1.6J response
            if (messageType === OCPP_MESSAGE_TYPE.CALL) {
              const resp = this.createResponse(action, uniqueId, payload);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(resp));
              }
            }
          } catch (e) {
            console.error('[Mock CSMS] Failed to process message:', e.message);
          }
        });

        ws.on('close', () => {
          console.log(`[Mock CSMS] Charger/Gateway disconnected for '${chargerId}'`);
          this.connectedClients.delete(chargerId);
        });
      });

      this.server.listen(this.port, () => {
        console.log(`[Mock CSMS] Listening on ws://localhost:${this.port}`);
        resolve(this);
      });
    });
  }

  createResponse(action, uniqueId, payload) {
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

  getReceivedFrames(chargerId = null) {
    if (chargerId) {
      return this.receivedFrames.filter(f => f.chargerId === chargerId);
    }
    return this.receivedFrames;
  }

  clear() {
    this.receivedFrames = [];
  }

  stop() {
    return new Promise((resolve) => {
      for (const [id, ws] of this.connectedClients.entries()) {
        try { ws.close(); } catch (e) {}
      }
      this.connectedClients.clear();

      if (this.wss) {
        try { this.wss.close(); } catch (e) {}
      }
      if (this.server) {
        this.server.close(() => {
          console.log('[Mock CSMS] Stopped.');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Standalone execution if run directly (node scripts/mockCsms.js [port])
if (require.main === module) {
  const port = parseInt(process.argv[2], 10) || 5500;
  const csms = new MockCsms(port);
  csms.start().then(() => {
    console.log(`Mock CSMS active. Press Ctrl+C to terminate.`);
  });
}

module.exports = MockCsms;

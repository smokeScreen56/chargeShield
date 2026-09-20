/**
 * ChargeShield Main Backend Server
 * Express REST API + WebSocket OCPP 1.6J Gateway + Socket.IO Real-time Dashboard Server
 */

const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server: SocketIOServer } = require('socket.io');
require('dotenv').config();

const { initDatabase, saveEvent, getStats } = require('./models/SecurityEvent');
const ocppGateway = require('./gateway/ocppGateway');
const detectionPipeline = require('./detection');
const chargerSimulator = require('./simulator/chargerSimulator');
const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// REST Routes
app.use('/api', apiRoutes);

// Root healthcheck
app.get('/', (req, res) => {
  res.json({
    name: 'ChargeShield Security Gateway Backend',
    version: '1.0.0',
    status: 'Running',
    stage: '50-60% Implementation',
    ocppGatewayUrl: 'ws://localhost:5000/ocpp/:chargerId',
    docs: '/api/stats'
  });
});

// Socket.IO for Live Dashboard Updates
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`[Dashboard Socket] Client connected (${socket.id})`);

  // Send current stats on connect
  getStats().then(stats => {
    socket.emit('stats_update', stats);
  }).catch(() => {});

  socket.on('disconnect', () => {
    console.log(`[Dashboard Socket] Client disconnected (${socket.id})`);
  });
});

// Broadcast security events to Dashboard
async function handleSecurityEvent(eventData) {
  try {
    const savedEvent = await saveEvent(eventData);
    io.emit('security_event', savedEvent);

    // Also push updated aggregate stats
    const stats = await getStats();
    io.emit('stats_update', stats);
  } catch (err) {
    console.error('[Server] Error handling security event:', err.message);
  }
}

// Initialize OCPP Gateway with Detection Pipeline
ocppGateway.init(server, detectionPipeline, handleSecurityEvent);

// Handle WebSocket upgrade for OCPP charger connections (ws://localhost:5000/ocpp/:chargerId)
server.on('upgrade', (request, socket, head) => {
  const pathname = request.url || '';

  if (pathname.startsWith('/ocpp')) {
    // Extract chargerId from URL: /ocpp/CP001 or /ocpp?chargerId=CP001
    const parts = pathname.split('/').filter(Boolean);
    let chargerId = parts[1];

    if (!chargerId && request.url.includes('?')) {
      const urlParams = new URLSearchParams(request.url.split('?')[1]);
      chargerId = urlParams.get('chargerId');
    }

    if (!chargerId) {
      chargerId = 'UNKNOWN';
    }

    ocppGateway.wss.handleUpgrade(request, socket, head, (ws) => {
      ocppGateway.wss.emit('connection', ws, request, chargerId);
    });
  }
  // Let other upgrade requests (such as Socket.IO) be handled by their respective handlers
});

// Start Server
const PORT = process.env.PORT || 5000;

async function bootstrap() {
  await initDatabase();

  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🛡️  ChargeShield Gateway Server is ACTIVE on port ${PORT}`);
    console.log(`📡 OCPP WebSocket Endpoint: ws://localhost:${PORT}/ocpp/:chargerId`);
    console.log(`📊 REST API & Dashboard Socket: http://localhost:${PORT}`);
    console.log(`=======================================================`);

    // Configure Simulator default target URL
    chargerSimulator.setGatewayUrl(`ws://localhost:${PORT}/ocpp`);
  });
}

bootstrap().catch(err => {
  console.error('[Server] Bootstrap failure:', err);
});

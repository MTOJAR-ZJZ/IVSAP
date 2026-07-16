import express from 'express';
import cors from 'cors';
import http from 'http';
import { config } from './config.js';
import { pool } from './db/pool.js';
import { setupWebSocket } from './routes/ws.js';

import authRoutes from './routes/auth.js';
import streamRoutes from './routes/streams.js';
import detectionRoutes from './routes/detections.js';
import alertRoutes from './routes/alerts.js';
import ticketRoutes from './routes/tickets.js';
import userRoutes from './routes/users.js';
import roleRoutes from './routes/roles.js';
import deptRoutes from './routes/depts.js';
import algoRoutes from './routes/algorithms.js';
import systemRoutes from './routes/system.js';

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors(config.cors));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/detections', detectionRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/depts', deptRoutes);
app.use('/api/algorithms', algoRoutes);
app.use('/api/system', systemRoutes);

// WebSocket
setupWebSocket(server);

// Start
server.listen(config.port, () => {
  console.log(`Stream Analyzer API running on http://localhost:${config.port}`);
  console.log(`WebSocket at ws://localhost:${config.port}/ws/alerts`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await pool.end();
  process.exit(0);
});

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { initializeSocket } from './socket.js';
import { authRouter } from './routes/auth.js';
import { paymentsRouter } from './routes/payments.js';
import { vetsRouter } from './routes/vets.js';
import { appointmentsRouter } from './routes/appointments.js';
import { animalsRouter } from './routes/animals.js';
import { fichesRouter } from './routes/fiches.js';
import { chatRouter } from './routes/chat.js';
import { adminRouter } from './routes/admin.js';
import { verifySmtp } from './services/mailer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
initializeSocket(httpServer);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (_req, res) => res.json({ name: config.appName, status: 'ok', version: '1.0.0' }));
app.get('/health', async (_req, res) => {
  res.json({ status: 'ok', smtp: await verifySmtp(), uptime: process.uptime() });
});

// Download APK endpoint
app.get('/downloads/app.apk', (_req, res) => {
  const apkPath = path.join(__dirname, '../public/downloads/mokineveto-v1.0.0.apk');
  res.download(apkPath, 'mokineveto-v1.0.0.apk', (err) => {
    if (err) {
      console.error('[downloads] APK error:', err);
      res.status(500).json({ success: false, error: 'Failed to download APK' });
    }
  });
});

// API Routes
app.use('/auth', authRouter);
app.use('/payments', paymentsRouter);
app.use('/vets', vetsRouter);
app.use('/appointments', appointmentsRouter);
app.use('/animals', animalsRouter);
app.use('/fiches', fichesRouter);
app.use('/chat', chatRouter);
app.use('/admin', adminRouter);

// 404 handler
app.use((_req, res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } }));

httpServer.listen(config.port, () => {
  console.log(`[${config.appName}] listening on port ${config.port} (${config.nodeEnv})`);
  console.log(`[socket.io] real-time chat enabled`);
});

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { paymentsRouter } from './routes/payments.js';
import { verifySmtp } from './services/mailer.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => res.json({ name: config.appName, status: 'ok' }));
app.get('/health', async (_req, res) => {
  res.json({ status: 'ok', smtp: await verifySmtp(), uptime: process.uptime() });
});

app.use('/auth', authRouter);
app.use('/payments', paymentsRouter);

app.use((_req, res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } }));

app.listen(config.port, () => {
  console.log(`[${config.appName}] écoute sur le port ${config.port}`);
});

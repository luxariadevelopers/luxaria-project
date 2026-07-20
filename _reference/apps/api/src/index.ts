import http from 'http';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { config } from './config';
import { initRealtime } from './services/realtime';
import { startPaymentReminderJob } from './jobs/paymentReminders';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import projectRoutes from './routes/projects';
import contributionRoutes from './routes/contributions';
import accountRoutes from './routes/accounts';
import expenseRoutes from './routes/expenses';
import stockRoutes from './routes/stock';
import purchaseRoutes from './routes/purchase';
import labourRoutes from './routes/labour';
import salesRoutes from './routes/sales';
import gstRoutes from './routes/gst';
import boqRoutes from './routes/boq';
import fileRoutes from './routes/files';
import notificationRoutes from './routes/notifications';
import dashboardRoutes from './routes/dashboard';

async function main() {
  await mongoose.connect(config.mongoUri);
  console.log('MongoDB connected');

  const app = express();
  app.use(
    cors({
      origin: config.corsOrigin === '*' ? true : config.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'luxaria-api' }));

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/projects', projectRoutes);
  app.use('/api/v1/contributions', contributionRoutes);
  app.use('/api/v1/accounts', accountRoutes);
  app.use('/api/v1/expenses', expenseRoutes);
  app.use('/api/v1/stock', stockRoutes);
  app.use('/api/v1/purchase', purchaseRoutes);
  app.use('/api/v1/labour', labourRoutes);
  app.use('/api/v1/sales', salesRoutes);
  app.use('/api/v1/gst', gstRoutes);
  app.use('/api/v1/boq', boqRoutes);
  app.use('/api/v1/files', fileRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  });

  const server = http.createServer(app);
  initRealtime(server);
  startPaymentReminderJob();

  server.listen(config.port, '0.0.0.0', () => {
    console.log(`Luxaria API listening on http://0.0.0.0:${config.port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start API', err);
  process.exit(1);
});

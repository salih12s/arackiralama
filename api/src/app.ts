import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { basicAuth } from './middleware/basicAuth';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import vehicleRoutes from './routes/vehicles';
import rentalRoutes from './routes/rentals';
import paymentRoutes from './routes/payments';
import reportRoutes from './routes/reports';
import analyticsRoutes from './routes/analytics';
import backupRoutes from './routes/backup';
import customerRoutes from './routes/customers';
import reservationRoutes from './routes/reservations';
import vehicleExpenseRoutes from './routes/vehicleExpenses';
import noteRoutes from './routes/notes';
import publicRoutes from './routes/public';
import { imageStorageConfig } from './services/imageStorageService';

// Load environment variables
dotenv.config();

const app = express();

// ---- CORS (EN ÜSTE) ----
// İzinli origin'ler yalnızca ortam değişkenlerinden gelir (ALLOWED_ORIGIN, PUBLIC_SITE_ORIGIN).
const allowlist = new Set<string>();

// Add environment origins if exist (virgülle ayrılmış birden fazla origin desteklenir:
// yönetim paneli + halka açık rezervasyon sitesi)
for (const envVar of [process.env.ALLOWED_ORIGIN, process.env.PUBLIC_SITE_ORIGIN]) {
  if (envVar && envVar !== '*') {
    envVar.split(',').map((o) => o.trim()).filter(Boolean).forEach((o) => allowlist.add(o));
  }
}

// Geliştirmede tek frontend origin'i (localhost:5173) otomatik olarak izinlidir.
const isDev = process.env.NODE_ENV !== 'production';

app.use((req, res, next) => {
  res.header("Vary", "Origin");
  next();
});

app.use(cors({
  origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return cb(null, true);
    if (process.env.ALLOWED_ORIGIN === '*') return cb(null, true);
    if (isDev && /^https?:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
    cb(null, allowlist.has(origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 204
}));

// Preflight for all routes
app.options("*", cors());

// ---- Other middleware AFTER CORS ----
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Security middleware
app.use(helmet());

// Local image storage is intentionally public and read-only. Production should
// use durable object storage instead of Railway's ephemeral filesystem.
if (imageStorageConfig.provider === 'local') {
  app.use('/uploads', express.static(imageStorageConfig.uploadDir, {
    fallthrough: false,
    immutable: true,
    maxAge: '1y',
    setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
  }));
}

// Add noindex header to all responses
app.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
});

// Skip basic auth for OPTIONS requests (preflight)
app.use((req, res, next) => {
  if (req.method === "OPTIONS") return next(); // Preflight'a dokunma
  return next();
});

// Optional basic authentication
// Halka açık vitrin uçları yönetim paneli kimlik doğrulamasından bağımsızdır.
app.use('/api/public', publicRoutes);
app.use(basicAuth);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Araç Kiralama API'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/vehicle-expenses', vehicleExpenseRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/stats', reportRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/backup', backupRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

export default app;

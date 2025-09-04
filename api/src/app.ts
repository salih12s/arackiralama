import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { basicAuth } from './middleware/basicAuth';
import authRoutes from './routes/auth';
import vehicleRoutes from './routes/vehicles';
import rentalRoutes from './routes/rentals';
import paymentRoutes from './routes/payments';
import reportRoutes from './routes/reports';
import analyticsRoutes from './routes/analytics';
import backupRoutes from './routes/backup';
import customerRoutes from './routes/customers';
import reservationRoutes from './routes/reservations';

// Load environment variables
dotenv.config();

const app = express();

// ---- CORS (EN ÜSTE) ----
const allowlist = new Set([
  // Doğru domain - console'da gelen bu
  "http://elitefilomuhasabe.com",
  "https://elitefilomuhasabe.com",
  "http://www.elitefilomuhasabe.com", 
  "https://www.elitefilomuhasabe.com",
  
  // Production domains
  "https://elitefilomuhasebe.com",
  "https://www.elitefilomuhasebe.com",
  "http://elitefilomuhasebe.com",
  "http://www.elitefilomuhasebe.com"
]);

// Add environment origin if exists
if (process.env.ALLOWED_ORIGIN && process.env.ALLOWED_ORIGIN !== '*') {
  allowlist.add(process.env.ALLOWED_ORIGIN);
}

// Debug: Log incoming origins
app.use((req, res, next) => {
  console.log("CORS DEBUG => Origin:", req.headers.origin, "Method:", req.method, "Path:", req.path);
  res.header("Vary", "Origin");
  next();
});

app.use(cors({
  origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return cb(null, true);
    
    // Allow all origins if ALLOWED_ORIGIN is *
    if (process.env.ALLOWED_ORIGIN === '*') return cb(null, true);
    
    // Check if origin is in allowlist
    const allowed = allowlist.has(origin);
    console.log(`CORS Check: ${origin} → ${allowed ? 'ALLOWED' : 'BLOCKED'}`);
    cb(null, allowed);
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
app.use('/api/stats', reportRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/backup', backupRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

export default app;

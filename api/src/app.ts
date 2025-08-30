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

// Load environment variables
dotenv.config();

const app = express();

// ---- CORS (EN ÜSTE) ----
const allowlist = new Set([
  "http://elitefilomuhasebe.com",
  "https://elitefilomuhasebe.com", 
  "http://www.elitefilomuhasebe.com",
  "https://www.elitefilomuhasebe.com",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174"
]);

// Add environment origin if exists
if (process.env.ALLOWED_ORIGIN && process.env.ALLOWED_ORIGIN !== '*') {
  allowlist.add(process.env.ALLOWED_ORIGIN);
}

// Add Vary header for proper caching
app.use((req, res, next) => { 
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
    cb(null, allowlist.has(origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200
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

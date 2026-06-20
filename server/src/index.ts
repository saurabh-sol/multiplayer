import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import playersRoutes from './routes/players';
import buildingsRoutes from './routes/buildings';
import tokensRoutes from './routes/tokens';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS Configuration - reads from CORS_ORIGINS env var (comma-separated URLs) or allows all
const envOrigins = process.env.CORS_ORIGINS;
const corsOrigins: string[] | boolean = envOrigins && envOrigins.trim().length > 0
  ? envOrigins.split(',').map(s => s.trim()).filter(s => s.length > 0)
  : true; // true = reflect request origin (allows all)

const corsOptions = {
  origin: Array.isArray(corsOrigins) && corsOrigins.length > 0 ? corsOrigins : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

// Enable pre-flight for all routes
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Treasure Hunt API Server', status: 'running' });
});

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/players', playersRoutes);
app.use('/api/buildings', buildingsRoutes);
app.use('/api/tokens', tokensRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Treasure Hunt Server running on http://localhost:${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api`);
});

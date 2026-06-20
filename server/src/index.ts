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
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : '*';

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));
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

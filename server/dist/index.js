"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const players_1 = __importDefault(require("./routes/players"));
const buildings_1 = __importDefault(require("./routes/buildings"));
const tokens_1 = __importDefault(require("./routes/tokens"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// CORS Configuration - reads from CORS_ORIGINS env var (comma-separated URLs) or allows all
const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
    : '*';
app.use((0, cors_1.default)({
    origin: corsOrigins,
    credentials: true
}));
app.use(express_1.default.json());
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
app.use('/api/auth', auth_1.default);
app.use('/api/players', players_1.default);
app.use('/api/buildings', buildings_1.default);
app.use('/api/tokens', tokens_1.default);
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
app.listen(PORT, () => {
    console.log(`🚀 Treasure Hunt Server running on http://localhost:${PORT}`);
    console.log(`📊 API: http://localhost:${PORT}/api`);
});
//# sourceMappingURL=index.js.map
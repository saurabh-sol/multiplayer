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
// Middleware
app.use((0, cors_1.default)({
    origin: ['http://localhost:8080', 'http://localhost:8081', 'http://127.0.0.1:8080', 'http://127.0.0.1:8081', 'http://localhost:3000'],
    credentials: true
}));
app.use(express_1.default.json());
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
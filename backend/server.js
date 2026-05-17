require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { startAllCrons } = require('./utils/cron');

connectDB();

const app = express();

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(mongoSanitize());
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json({ limit: '5mb' }));  // allow avatar uploads
app.use(express.urlencoded({ extended: true }));

// Rate limiting — global
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 300, message: { success: false, message: 'Too many requests. Try again later.' } }));
// Stricter on auth
app.use('/api/auth/', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Too many login attempts. Wait 15 minutes.' } }));

// Routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/expenses',  require('./routes/expenses'));
app.use('/api/income',    require('./routes/income'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/recurring', require('./routes/recurring'));
app.use('/api/user',      require('./routes/user'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/budgets',   require('./routes/budgets'));
app.use('/api/goals',     require('./routes/goals'));

app.get('/api/health', (req, res) => res.json({ success: true, message: 'FinTrack API running 🚀', timestamp: new Date() }));
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found.' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`FinTrack server running on port ${PORT}`);
    // Only start crons in local development, not on Vercel
    if (process.env.NODE_ENV !== 'production') {
        startAllCrons();
    }
});

module.exports = app;
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import passport from 'passport';
import connectDB from './config/db.js';
import configurePassport from './config/passport.js';
import authRoutes from './routes/auth.routes.js';
import businessRoutes from './routes/business.routes.js';
import appointmentRoutes from './routes/appointment.routes.js';
import paymentRoutes, { handleWebhook } from './routes/payment.routes.js';

configurePassport();

const app = express();
const PORT = process.env.PORT || 5000;

// Reduces XSS/clickjacking risk via default security headers without hand-rolling every header
app.use(helmet());
// Request logging makes local debugging tractable before a dedicated log stack exists
app.use(morgan('dev'));
// Origin allowlist prevents browsers on other sites from calling authenticated cookies against this API
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Stripe signatures bind to the raw bytes — mounting JSON parsers first invalidates verification
app.post('/api/v1/payments/webhook', express.raw({ type: 'application/json' }), handleWebhook);

app.use(express.json());
app.use(passport.initialize());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/businesses', businessRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/payments', paymentRoutes);

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Bookr API is running',
    data: {},
  });
});

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Bookr API listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

start();

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import connectDB from './config/db.js';

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
app.use(express.json());

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

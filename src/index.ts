import express from 'express';
import Router from './routes'
import cors from 'cors'
import cookieParser from 'cookie-parser';

const app = express();
app.use(cookieParser());

const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
  origin: 'https://ai-word-doc.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

app.use(express.json());

app.use('/api', Router);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

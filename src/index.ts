import express from 'express';
import Router from './routes'
import cors from 'cors'
import cookieParser from 'cookie-parser';

const app = express();
app.use(cookieParser());

const PORT = process.env.PORT || 5000;

app.use(express.json());

const allowedOrigins = [
  'http://localhost:3000',
  'https://ai-word-doc.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },  credentials: true,
}));

app.use('/api',Router);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

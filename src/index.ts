import express from 'express';
import Router from './routes'
import cors from 'cors'
import cookieParser from 'cookie-parser';

const app = express();
app.use(cookieParser());

const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

app.use('/api',Router);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

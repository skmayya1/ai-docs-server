import express from 'express';
import Router from './routes'
import cors from 'cors'
import cookieParser from 'cookie-parser';

const app = express();
app.use(cookieParser());

const PORT = process.env.PORT || 5000;


app.use(cors({
  origin: 'https://ai-word-doc.vercel.app',
  credentials: true,
}));


app.use(express.json());

app.use('/api', Router);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

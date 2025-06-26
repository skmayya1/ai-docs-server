import express from 'express';
import Router from './routes'
import cors from 'cors'
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv'

dotenv.config()

const app = express();
app.use(cookieParser());

const PORT = process.env.PORT || 5000;


const DEVELOPMENT = process.env.DEVELOPMENT

const origin = DEVELOPMENT ? 'http://localhost:3000' : 'https://lexa.skmayya.me'

app.use(cors({
  origin,
  credentials: true,
}));


app.use(express.json());

app.use('/api', Router);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

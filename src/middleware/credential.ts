import { NextFunction, Request, Response } from "express"
import dotenv from "dotenv"
import jwt from "jsonwebtoken"

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET || "sksksk";

export const checkCredentialsCookie = (req: Request, res: Response, next: NextFunction) => {

    const credentials: string = req.cookies.credential;

    if (!credentials.trim()) {
        res.status(401).json({ error: 'No credentials cookie found' });
        return
    }

    const decoded = jwt.verify(credentials, JWT_SECRET);

    if (typeof decoded === 'object' && decoded !== null && 'data' in decoded) {
        req.body = { apiKey: (decoded as any).data, ...req.body };
    }
    next();
};
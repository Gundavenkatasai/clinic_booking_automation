import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiGeneralLimiter } from './middleware/rateLimiter.js';

export function createApp(): Express {
  const app = express();

  // Security Headers
  app.use(helmet());

  // Allowed Origins
  const allowedOrigins = [
    config.patientAppOrigin,
    config.adminAppOrigin,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ].filter(Boolean);

  app.use(
    cors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (e.g. mobile apps, curl, postman, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not permitted by CORS policy`), false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id', 'idempotency-key'],
    })
  );

  // Body Parsing & Cookies
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // General rate limiter on all API endpoints
  app.use('/api', apiGeneralLimiter);

  // Mount Application Routes
  app.use('/api', routes);

  // 404 Handler for unmatched routes
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Route ${req.method} ${req.url} does not exist on this server`,
      },
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}

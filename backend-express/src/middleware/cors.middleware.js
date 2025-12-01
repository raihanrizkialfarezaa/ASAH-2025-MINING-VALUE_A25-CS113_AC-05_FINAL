import cors from 'cors';
import config from '../config/env.js';
import logger from '../config/logger.js';

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = config.cors.origin.split(',').map((o) => o.trim());

    // Log for debugging (helpful during development)
    if (config.env === 'development') {
      logger.debug(`CORS request from origin: ${origin || 'undefined'}`);
    }

    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

export default cors(corsOptions);

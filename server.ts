import express from 'express';
import { createServer as createViteServer } from 'vite';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './server/routes.js';
import { seedAdmin } from './server/auth.js';
import connectDB from './server/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// API Router
const apiRouter = express.Router();

// Ensure DB connection before any API request
apiRouter.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({ message: 'Database connection failed' });
  }
});

// Register API routes
apiRouter.use(apiRoutes);

apiRouter.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' 
  });
});

// Mount API router
app.use('/api', apiRouter);

// Vite middleware for development or static serving for production
async function setupFrontend() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// Only start the server if not in a serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  setupFrontend().then(() => {
    app.listen(PORT, '0.0.0.0', async () => {
      console.log(`Server running on http://localhost:${PORT}`);
      try {
        await connectDB();
        await seedAdmin();
      } catch (err) {
        console.error('Failed to seed admin:', err);
      }
    });
  });
} else {
  // In Vercel, we still want to seed admin if possible
  // This might be called multiple times, but seedAdmin is idempotent
  connectDB().then(() => seedAdmin()).catch(err => console.error('Vercel startup seed error:', err));
  setupFrontend();
}

export default app;

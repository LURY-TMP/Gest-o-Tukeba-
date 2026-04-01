import express from 'express';
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
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(cors());
app.use(express.json());

// Ensure DB connection before any API request
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({ message: 'Database connection failed' });
  }
});

// Register API routes
app.use('/api', apiRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ message: `API route not found: ${req.originalUrl}` });
});

// Frontend: só em dev (Vite), em produção o Vercel serve o dist estático
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), 'dist');
  const { default: serveStatic } = await import('serve-static');
  app.use(serveStatic(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Iniciar servidor apenas fora do Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    try {
      await connectDB();
      await seedAdmin();
    } catch (err) {
      console.error('Erro ao iniciar admin:', err);
    }
  });
} else {
  connectDB()
    .then(() => seedAdmin())
    .catch(err => console.error('Vercel seed error:', err));
}

export default app;

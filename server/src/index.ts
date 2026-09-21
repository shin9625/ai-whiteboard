import express from 'express';
import cors from 'cors';
import { dbManager } from './db/database.js';
import { apiRouter } from './api/routes.js';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 8086;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// Serve static frontend
const possibleDistPaths = [
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), '../client/dist'),
  path.resolve(__dirname, '../../client/dist'),
];

let clientDist = possibleDistPaths.find((p) => fs.existsSync(p));

if (clientDist) {
  console.log(`📦 Serving static client from: ${clientDist}`);
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist!, 'index.html'));
  });
} else {
  console.warn('⚠️ client/dist not found, static frontend will not be served');
}

async function startServer() {
  await dbManager.init();
  console.log('✅ SQLite Database initialized successfully.');

  app.listen(PORT, () => {
    console.log(`🚀 WHITEBOARD Server running at http://localhost:${PORT}`);
    console.log(`📡 SSE Stream available at http://localhost:${PORT}/api/events`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

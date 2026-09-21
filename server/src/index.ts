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

// Authentication Middleware (Basic Auth & API Key for Private Access)
const authUser = process.env.AUTH_USER || process.env.AUTH_USERNAME || 'admin';
const authPass = process.env.AUTH_PASS || process.env.AUTH_PASSWORD;
const authKey = process.env.AUTH_KEY || authPass;

app.use((req, res, next) => {
  // If no password configured in environment, allow all (open mode)
  if (!authPass) {
    return next();
  }

  // 1. API Key via Query Parameter (e.g. /mcp/sse?key=xxx)
  const queryKey = req.query.key || req.query.api_key;
  if (queryKey && (queryKey === authKey || queryKey === authPass)) {
    return next();
  }

  // 2. API Key via Header (x-api-key: xxx)
  const apiKeyHeader = req.headers['x-api-key'];
  if (apiKeyHeader && (apiKeyHeader === authKey || apiKeyHeader === authPass)) {
    return next();
  }

  // 3. Authorization Header (Bearer or Basic)
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token === authKey || token === authPass) {
        return next();
      }
    }
    if (authHeader.startsWith('Basic ')) {
      try {
        const credentials = Buffer.from(authHeader.substring(6), 'base64').toString('utf-8');
        const [user, ...rest] = credentials.split(':');
        const pass = rest.join(':');
        if (user === authUser && pass === authPass) {
          return next();
        }
      } catch {
        // invalid base64
      }
    }
  }

  // Authentication Required
  res.setHeader('WWW-Authenticate', 'Basic realm="AI Whiteboard - Private Access"');
  return res.status(401).send('401 Unauthorized: パスワードが必要です。ユーザー名とパスワードを入力してください。');
});

import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMcpServer } from './mcp/server.js';

// API Routes
app.use('/api', apiRouter);

// Remote MCP Server (SSE Transport)
let mcpTransport: SSEServerTransport | null = null;
const mcpServer = createMcpServer();

app.get('/mcp/sse', async (req, res) => {
  console.log('🤖 AI client connected to Remote MCP via SSE');
  const key = req.query.key || req.query.api_key;
  const messagesEndpoint = key ? `/mcp/messages?key=${encodeURIComponent(key as string)}` : '/mcp/messages';
  mcpTransport = new SSEServerTransport(messagesEndpoint, res);
  await mcpServer.connect(mcpTransport);
});

app.post('/mcp/messages', async (req, res) => {
  if (mcpTransport) {
    await mcpTransport.handlePostMessage(req, res);
  } else {
    res.status(400).send('No active MCP SSE transport');
  }
});

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
    if (req.path.startsWith('/api') || req.path.startsWith('/mcp')) return next();
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

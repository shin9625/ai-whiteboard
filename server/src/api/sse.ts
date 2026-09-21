import { Response } from 'express';
import { BoardEvent, BoardEventType } from '../types.js';

class SSEManager {
  private clients: Set<Response> = new Set();

  addClient(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    this.clients.add(res);

    // Initial ping
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: new Date().toISOString() })}\n\n`);

    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  broadcast(type: BoardEventType, payload: any): void {
    const event: BoardEvent = {
      type,
      timestamp: new Date().toISOString(),
      payload,
    };

    const message = `event: ${type}\ndata: ${JSON.stringify(event)}\n\n`;

    for (const client of this.clients) {
      try {
        client.write(message);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const sseManager = new SSEManager();

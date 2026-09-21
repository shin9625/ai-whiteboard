import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './server.js';
import { dbManager } from '../db/database.js';

async function main() {
  await dbManager.init();
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Stdioトランスポートでは標準出力にログを出すとJSON-RPCプロトコルが破壊されるため stderr に出力
  console.error('WHITEBOARD MCP Server running on stdio');
}

main().catch((err) => {
  console.error('MCP Server Error:', err);
  process.exit(1);
});

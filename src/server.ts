import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { EtherpadClient } from "./etherpad-client.js";
import { registerPadTools } from "./tools/pad-tools.js";
import { registerContentTools } from "./tools/content-tools.js";
import { registerExportTools } from "./tools/export-tools.js";

export function createServer(client: EtherpadClient, publicUrl: string, authorId: string, downloadBaseUrl?: string): McpServer {
  const server = new McpServer({
    name: "etherpad-mcp",
    version: "1.0.0",
  });

  registerPadTools(server, client, publicUrl);
  registerContentTools(server, client, publicUrl, authorId);
  registerExportTools(server, client, downloadBaseUrl);

  return server;
}

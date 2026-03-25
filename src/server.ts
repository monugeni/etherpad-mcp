import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { EtherpadClient } from "./etherpad-client.js";
import { registerPadTools } from "./tools/pad-tools.js";
import { registerContentTools } from "./tools/content-tools.js";

export function createServer(client: EtherpadClient): McpServer {
  const server = new McpServer({
    name: "etherpad-mcp",
    version: "1.0.0",
  });

  registerPadTools(server, client);
  registerContentTools(server, client);

  return server;
}

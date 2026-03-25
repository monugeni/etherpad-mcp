import express from "express";
import { randomUUID } from "node:crypto";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { EtherpadClient } from "./etherpad-client.js";
import { createServer } from "./server.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const client = new EtherpadClient(config.etherpadUrl, config.etherpadApiKey);

// Verify Etherpad connectivity
try {
  await client.checkToken();
  console.error("Connected to Etherpad at", config.etherpadUrl);
} catch (err) {
  console.error("Failed to connect to Etherpad:", err);
  process.exit(1);
}

// Parse CLI args for transport override
const transportArg = process.argv.includes("--stdio")
  ? "stdio"
  : process.argv.includes("--http")
    ? "http"
    : config.transport;

if (transportArg === "stdio") {
  const server = createServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Etherpad MCP server running on stdio");
} else {
  const app = express();
  app.use(express.json());

  // Optional Bearer token auth
  if (config.mcpApiKey) {
    app.use("/mcp", (req, res, next) => {
      const auth = req.headers.authorization;
      if (auth !== `Bearer ${config.mcpApiKey}`) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      next();
    });
  }

  // Track sessions: sessionId -> { transport, server }
  const sessions = new Map<string, { transport: StreamableHTTPServerTransport; server: ReturnType<typeof createServer> }>();

  app.post("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      await session.transport.handleRequest(req, res, req.body);
      return;
    }

    // New session — create transport with sessionIdGenerator
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        sessions.set(id, { transport, server });
        console.error(`Session initialized: ${id}`);
      },
    });

    const server = createServer(client);

    transport.onclose = () => {
      const id = transport.sessionId;
      if (id) sessions.delete(id);
      console.error(`Session closed: ${id}`);
    };

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.get("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !sessions.has(sessionId)) {
      res.status(400).json({ error: "Invalid or missing session ID" });
      return;
    }
    const session = sessions.get(sessionId)!;
    await session.transport.handleRequest(req, res);
  });

  app.delete("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !sessions.has(sessionId)) {
      res.status(400).json({ error: "Invalid or missing session ID" });
      return;
    }
    const session = sessions.get(sessionId)!;
    await session.transport.handleRequest(req, res);
  });

  app.get("/health", async (_req, res) => {
    try {
      await client.checkToken();
      res.json({ status: "ok", etherpad: config.etherpadUrl });
    } catch {
      res.status(503).json({ status: "error", message: "Cannot reach Etherpad" });
    }
  });

  app.listen(config.port, config.host, () => {
    console.error(`Etherpad MCP server listening on http://${config.host}:${config.port}/mcp`);
  });
}

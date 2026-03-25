import express from "express";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { EtherpadClient } from "./etherpad-client.js";
import { createServer } from "./server.js";
import { loadConfig } from "./config.js";
import { EXPORT_DIR } from "./tools/export-tools.js";

const config = await loadConfig();
const client = new EtherpadClient(config.etherpadUrl, config.etherpadApiKey);

// Wait for Etherpad to be ready
for (let attempt = 1; ; attempt++) {
  try {
    await client.checkToken();
    console.error("Connected to Etherpad at", config.etherpadUrl);
    break;
  } catch (err) {
    if (attempt >= 30) {
      console.error("Failed to connect to Etherpad after 30 attempts:", err);
      process.exit(1);
    }
    console.error(`Waiting for Etherpad (attempt ${attempt}/30)...`);
    await new Promise((r) => setTimeout(r, 2000));
  }
}

// Parse CLI args for transport override
const transportArg = process.argv.includes("--stdio")
  ? "stdio"
  : process.argv.includes("--http")
    ? "http"
    : config.transport;

// Derive MCP public URL for download links
const epUrl = new URL(config.etherpadPublicUrl);
const mcpPublicUrl = `${epUrl.protocol}//${epUrl.hostname}:${config.port}`;

if (transportArg === "stdio") {
  const authorName = config.authorName;
  const author = await client.createAuthorIfNotExistsFor(`mcp-${authorName}`, authorName);
  console.error(`Registered as author "${authorName}" (${author.authorID})`);
  const server = createServer(client, config.etherpadPublicUrl, author.authorID);
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
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

    // Get author name from X-Author-Name header, fall back to config
    const authorName = (req.headers["x-author-name"] as string) || config.authorName;
    const author = await client.createAuthorIfNotExistsFor(`mcp-${authorName}`, authorName);
    console.error(`New session for author "${authorName}" (${author.authorID})`);

    // New session — create transport with sessionIdGenerator
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        sessions.set(id, { transport, server });
        console.error(`Session initialized: ${id}`);
      },
    });

    const server = createServer(client, config.etherpadPublicUrl, author.authorID, mcpPublicUrl);

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

  // Serve exported document downloads (no auth required)
  app.get("/downloads/:filename", (req, res) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(EXPORT_DIR, filename);
    if (!existsSync(filePath)) {
      res.status(404).json({ error: "File not found or expired" });
      return;
    }
    res.download(filePath, filename);
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

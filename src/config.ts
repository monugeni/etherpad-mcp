export interface Config {
  etherpadUrl: string;
  etherpadApiKey: string;
  port: number;
  host: string;
  mcpApiKey?: string;
  transport: "http" | "stdio";
}

export function loadConfig(): Config {
  const etherpadUrl = process.env.ETHERPAD_URL;
  const etherpadApiKey = process.env.ETHERPAD_API_KEY;

  if (!etherpadUrl) {
    throw new Error("ETHERPAD_URL environment variable is required");
  }
  if (!etherpadApiKey) {
    throw new Error("ETHERPAD_API_KEY environment variable is required");
  }

  const transport = process.env.TRANSPORT ?? "http";
  if (transport !== "http" && transport !== "stdio") {
    throw new Error('TRANSPORT must be "http" or "stdio"');
  }

  return {
    etherpadUrl: etherpadUrl.replace(/\/+$/, ""),
    etherpadApiKey,
    port: parseInt(process.env.PORT || "8209", 10),
    host: process.env.HOST || "0.0.0.0",
    mcpApiKey: process.env.MCP_API_KEY || undefined,
    transport,
  };
}

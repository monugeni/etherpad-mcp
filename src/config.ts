export interface Config {
  etherpadUrl: string;
  etherpadPublicUrl: string;
  etherpadApiKey: string;
  port: number;
  host: string;
  mcpApiKey?: string;
  transport: "http" | "stdio";
}

export async function loadConfig(): Promise<Config> {
  const { readFileSync } = await import("node:fs");

  const etherpadUrl = process.env.ETHERPAD_URL;
  let etherpadApiKey = process.env.ETHERPAD_API_KEY;

  // Support reading API key from a file (for Docker where Etherpad generates its own key)
  if (!etherpadApiKey && process.env.ETHERPAD_API_KEY_FILE) {
    etherpadApiKey = readFileSync(process.env.ETHERPAD_API_KEY_FILE, "utf-8").trim();
  }

  if (!etherpadUrl) {
    throw new Error("ETHERPAD_URL environment variable is required");
  }
  if (!etherpadApiKey) {
    throw new Error("ETHERPAD_API_KEY or ETHERPAD_API_KEY_FILE environment variable is required");
  }

  const transport = process.env.TRANSPORT ?? "http";
  if (transport !== "http" && transport !== "stdio") {
    throw new Error('TRANSPORT must be "http" or "stdio"');
  }

  const etherpadPublicUrl = (process.env.ETHERPAD_PUBLIC_URL || etherpadUrl).replace(/\/+$/, "");

  return {
    etherpadUrl: etherpadUrl.replace(/\/+$/, ""),
    etherpadPublicUrl,
    etherpadApiKey,
    port: parseInt(process.env.PORT || "8209", 10),
    host: process.env.HOST || "0.0.0.0",
    mcpApiKey: process.env.MCP_API_KEY || undefined,
    transport,
  };
}

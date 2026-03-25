import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { EtherpadClient } from "../etherpad-client.js";

export function registerPadTools(server: McpServer, client: EtherpadClient, publicUrl: string) {
  const padUrl = (padId: string) => `${publicUrl}/p/${padId}`;

  server.tool(
    "create_pad",
    "Create a new Etherpad document with optional initial text",
    { padId: z.string().describe("Unique pad identifier"), text: z.string().optional().describe("Initial text content") },
    { destructiveHint: false, readOnlyHint: false },
    async ({ padId, text }) => {
      await client.createPad(padId, text);
      return { content: [{ type: "text", text: `Pad created: ${padUrl(padId)}` }] };
    }
  );

  server.tool(
    "delete_pad",
    "Permanently delete an Etherpad document",
    { padId: z.string().describe("Pad identifier to delete") },
    { destructiveHint: true, readOnlyHint: false },
    async ({ padId }) => {
      await client.deletePad(padId);
      return { content: [{ type: "text", text: `Pad "${padId}" deleted.` }] };
    }
  );

  server.tool(
    "list_all_pads",
    "List all pads on the Etherpad instance. Each pad can be opened at the URL shown.",
    {},
    { readOnlyHint: true, destructiveHint: false },
    async () => {
      const result = await client.listAllPads();
      if (result.padIDs.length === 0) {
        return { content: [{ type: "text", text: "(no pads)" }] };
      }
      const lines = result.padIDs.map((id) => `${id} — ${padUrl(id)}`);
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );
}

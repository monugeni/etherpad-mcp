import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { EtherpadClient } from "../etherpad-client.js";

export function registerContentTools(server: McpServer, client: EtherpadClient, publicUrl: string) {
  const padUrl = (padId: string) => `${publicUrl}/p/${padId}`;
  server.tool(
    "get_text",
    "Read the plain text content of a pad. Returns the text and current revision number.",
    { padId: z.string().describe("Pad identifier") },
    { readOnlyHint: true, destructiveHint: false },
    async ({ padId }) => {
      const [text, revs] = await Promise.all([
        client.getText(padId),
        client.getRevisionsCount(padId),
      ]);
      return {
        content: [{ type: "text", text: `[revision ${revs.revisions}] ${padUrl(padId)}\n${text.text}` }],
      };
    }
  );

  server.tool(
    "edit_text",
    "Make a surgical edit to a pad by replacing a specific section of text. Finds the exact old_text in the pad and replaces it with new_text. Only the changed portion appears as an edit to other users, like a human typing. Use this instead of set_text for modifications.",
    {
      padId: z.string().describe("Pad identifier"),
      old_text: z.string().describe("Exact text to find in the pad (must match precisely)"),
      new_text: z.string().describe("Replacement text"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async ({ padId, old_text, new_text }) => {
      const current = await client.getText(padId);
      const idx = current.text.indexOf(old_text);
      if (idx === -1) {
        return {
          isError: true,
          content: [{ type: "text", text: `Could not find the specified text in pad "${padId}". Read the pad again with get_text to see the current content.` }],
        };
      }
      // Check for ambiguous matches
      const secondIdx = current.text.indexOf(old_text, idx + 1);
      if (secondIdx !== -1) {
        return {
          isError: true,
          content: [{ type: "text", text: `The specified text appears multiple times in pad "${padId}". Provide a longer, unique snippet to match exactly one location.` }],
        };
      }
      const updated = current.text.substring(0, idx) + new_text + current.text.substring(idx + old_text.length);
      await client.setText(padId, updated);
      const revs = await client.getRevisionsCount(padId);
      return { content: [{ type: "text", text: `Edit applied to pad "${padId}". Now at revision ${revs.revisions}.` }] };
    }
  );

  server.tool(
    "set_text",
    "Replace the entire content of a pad. Only use this for writing a completely new document, not for edits — use edit_text for modifications.",
    {
      padId: z.string().describe("Pad identifier"),
      text: z.string().describe("New text content"),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    async ({ padId, text }) => {
      await client.setText(padId, text);
      const revs = await client.getRevisionsCount(padId);
      return { content: [{ type: "text", text: `Pad "${padId}" updated. Now at revision ${revs.revisions}.` }] };
    }
  );

  server.tool(
    "append_text",
    "Append text to the end of a pad",
    {
      padId: z.string().describe("Pad identifier"),
      text: z.string().describe("Text to append"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async ({ padId, text }) => {
      await client.appendText(padId, text);
      const revs = await client.getRevisionsCount(padId);
      return { content: [{ type: "text", text: `Text appended to pad "${padId}". Now at revision ${revs.revisions}.` }] };
    }
  );

  server.tool(
    "get_changes",
    "See what changed in a pad since a given revision, including who made the changes. Use this after get_text to check if collaborators have edited the document.",
    {
      padId: z.string().describe("Pad identifier"),
      sinceRevision: z.number().describe("Revision number you last saw (returned by get_text, set_text, etc.)"),
    },
    { readOnlyHint: true, destructiveHint: false },
    async ({ padId, sinceRevision }) => {
      const revs = await client.getRevisionsCount(padId);
      if (revs.revisions <= sinceRevision) {
        return { content: [{ type: "text", text: "No changes since revision " + sinceRevision + "." }] };
      }
      const diff = await client.createDiffHTML(padId, sinceRevision, revs.revisions);
      const authors = diff.authors.length > 0 ? diff.authors.join(", ") : "unknown";
      return {
        content: [{
          type: "text",
          text: `Changes from revision ${sinceRevision} → ${revs.revisions} (by ${authors}):\n${diff.html}`,
        }],
      };
    }
  );
}

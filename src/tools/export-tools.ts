import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { EtherpadClient } from "../etherpad-client.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

const execFileAsync = promisify(execFile);
export const EXPORT_DIR = "/tmp/etherpad-exports";

const MIME: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  odt: "application/vnd.oasis.opendocument.text",
  pdf: "application/pdf",
  rtf: "application/rtf",
  html: "text/html",
};

export function registerExportTools(server: McpServer, client: EtherpadClient, downloadBaseUrl?: string) {
  server.tool(
    "export_pad",
    "Export a pad to a downloadable document (docx, odt, pdf, rtf, html). Converts pad content via Markdown using pandoc. Returns a download URL valid for 10 minutes.",
    {
      padId: z.string().describe("Pad identifier"),
      format: z.enum(["docx", "odt", "pdf", "rtf", "html"]).default("docx").describe("Export format"),
    },
    { readOnlyHint: true, destructiveHint: false },
    async ({ padId, format }) => {
      const markdown = await client.getMarkdown(padId);

      await mkdir(EXPORT_DIR, { recursive: true });

      const id = randomUUID().slice(0, 8);
      const filename = `${padId}-${id}.${format}`;
      const outputPath = path.join(EXPORT_DIR, filename);
      const inputPath = path.join(EXPORT_DIR, `${padId}-${id}.md`);

      await writeFile(inputPath, markdown, "utf-8");

      try {
        const args = [inputPath, "-o", outputPath, "--standalone"];
        if (format === "pdf") {
          args.push("--pdf-engine=weasyprint");
        }
        await execFileAsync("pandoc", args, { timeout: 30_000 });
      } catch (err: any) {
        await unlink(outputPath).catch(() => {});
        return {
          isError: true,
          content: [{ type: "text" as const, text: `Export failed: ${err.message || err}` }],
        };
      } finally {
        await unlink(inputPath).catch(() => {});
      }

      // Auto-cleanup after 10 minutes
      setTimeout(() => unlink(outputPath).catch(() => {}), 10 * 60 * 1000);

      if (downloadBaseUrl) {
        const url = `${downloadBaseUrl}/downloads/${encodeURIComponent(filename)}`;
        return { content: [{ type: "text" as const, text: `Exported "${padId}" as ${format.toUpperCase()}.\nDownload: ${url}` }] };
      }
      return { content: [{ type: "text" as const, text: `Exported "${padId}" to ${outputPath}` }] };
    }
  );
}

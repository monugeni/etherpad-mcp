# Etherpad MCP

A single Docker image that runs both Etherpad and an MCP server, so Claude Desktop can collaboratively edit documents with you — like two humans working on the same pad.

## Quick Start

```bash
git clone https://github.com/monugeni/etherpad-mcp.git
cd etherpad-mcp
# Edit docker-compose.yml to set your passwords and MCP_API_KEY
docker compose up -d --build
```

This gives you:
- **Port 8208** — Etherpad web UI (open in your browser to edit pads)
- **Port 8209** — MCP server (connect Claude Desktop here)

### Start / Stop / Update

```bash
docker compose up -d          # start
docker compose down            # stop
docker compose restart         # restart

# After pushing code changes:
git pull && docker compose up -d --build
```

## Claude Desktop Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "etherpad": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://<server-ip>:8209/mcp",
        "--header",
        "Authorization:Bearer <your-MCP_API_KEY>",
        "--allow-http"
      ]
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `list_all_pads` | List all pads on the instance |
| `create_pad` | Create a new pad with optional initial text |
| `delete_pad` | Permanently delete a pad |
| `get_text` | Read pad content and current revision number |
| `edit_text` | Surgical find-and-replace edit (appears as a natural edit to other users) |
| `set_text` | Replace entire pad content (use for new documents only) |
| `append_text` | Append text to end of pad |
| `get_changes` | See what changed since a revision, with author attribution |

## Collaboration Workflow

1. Claude reads a pad with `get_text` → gets content + revision number
2. You edit the pad in your browser at `http://<server-ip>:8208/p/<padId>`
3. Claude calls `get_changes(sinceRevision)` → sees exactly what you changed and who changed it
4. Claude makes surgical edits with `edit_text` → other users see only the changed section
5. Repeat

## Standalone Setup (MCP server only)

If you already have an Etherpad instance running separately:

```bash
npm install && npm run build
```

Create `.env`:
```
ETHERPAD_URL=http://your-etherpad-host:9001
ETHERPAD_API_KEY=<from Etherpad's APIKEY.txt>
```

```bash
npm start                    # HTTP mode on port 8209
node dist/index.js --stdio   # stdio mode for local dev
```

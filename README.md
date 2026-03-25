# Etherpad MCP Server

MCP server that connects Claude Desktop to an Etherpad instance, enabling collaborative document editing — like two humans working on the same document.

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

## Docker Setup (recommended)

Single container running both Etherpad and the MCP server.

```bash
git clone https://github.com/monugeni/etherpad-mcp.git
cd etherpad-mcp
# Edit docker-compose.yml to set your passwords and MCP_API_KEY
docker compose up -d --build
```

Ports:
- `8208` — Etherpad web UI
- `8209` — MCP server

### Start / Stop / Update

```bash
docker compose up -d        # start
docker compose down          # stop
docker compose restart       # restart

# After pushing code changes:
git pull && docker compose up -d --build
```

## Standalone Setup (without Docker)

```bash
npm install
npm run build
```

Create `.env` from `.env.example`:

```
ETHERPAD_URL=http://localhost:9001
ETHERPAD_API_KEY=<from Etherpad's APIKEY.txt>
```

```bash
npm start                    # HTTP mode on port 8209
node dist/index.js --stdio   # stdio mode
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

## Collaboration Workflow

1. Claude reads a pad with `get_text` → gets content + revision number
2. You edit the pad in your browser
3. Claude calls `get_changes(sinceRevision)` → sees exactly what you changed and who changed it
4. Claude makes surgical edits with `edit_text` → other users see only the changed section
5. Repeat

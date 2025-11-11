# Figma MCP Quick Start Guide

✅ **Package Installed**: `mcp-figma` is now in your project!

## Next Steps:

### 1. Get Your Figma API Token

1. Go to https://www.figma.com/settings
2. Scroll to "Personal access tokens"
3. Click "Create new token"
4. Name it (e.g., "Cursor MCP")
5. **Copy the token** (starts with `figd_`)

### 2. Configure MCP in Cursor

1. Open Cursor Settings:
   - Press `Cmd + ,` (macOS) or `Ctrl + ,` (Windows/Linux)
   - Or: Cursor → Settings

2. Search for "MCP" or "Model Context Protocol"

3. Add this configuration:

```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-figma"
      ]
    }
  }
}
```

**OR** if you want to use the local installation:

```json
{
  "mcpServers": {
    "figma": {
      "command": "node",
      "args": [
        "./node_modules/mcp-figma/dist/index.js"
      ],
      "cwd": "/Users/a90850/Desktop/Apperal"
    }
  }
}
```

### 3. Set Your Figma API Key

After restarting Cursor, you can set your API key by asking me:

```
Please use mcp-figma to set my Figma API key: figd_xxxxxxxxxxxxxxxxxxxxxxx
```

Or the MCP server will prompt you when you first use it.

### 4. Restart Cursor

Close and reopen Cursor to load the MCP server.

### 5. Test the Connection

Once connected, you can ask me to:
- Fetch a Figma file
- Get design tokens (colors, typography)
- Export images from Figma
- List components
- Get styles

## Example Commands

After setup, you can use commands like:
- "Get the Figma file with key abc123"
- "Export images from this Figma file"
- "Get all colors from this design"
- "List all components in this file"

## Troubleshooting

- **MCP not connecting**: Check Cursor's MCP status in settings
- **Token not working**: Verify token at https://www.figma.com/settings
- **Commands not available**: Make sure Cursor is restarted after configuration

## Available MCP Tools

The `mcp-figma` server provides:
- `get_file` - Get a Figma file
- `get_file_nodes` - Get specific nodes
- `get_image` - Export images
- `get_comments` - Get comments
- `get_team_components` - List team components
- `get_file_components` - Get file components
- `get_team_styles` - Get design tokens
- And more!

---

**Ready to connect?** Get your Figma token and configure Cursor, then we can start using Figma designs in your code!


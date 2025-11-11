# Cursor MCP Configuration for Figma

## Where to Configure MCP in Cursor

MCP servers are configured in Cursor's settings file. The location depends on your OS:

### macOS
```
~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

Or in Cursor Settings:
1. Open Cursor
2. Press `Cmd + ,` (or go to Cursor → Settings)
3. Search for "MCP" or "Model Context Protocol"
4. Click "Edit in settings.json"

### Windows
```
%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json
```

### Linux
```
~/.config/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

## Configuration Format

Add this to your MCP settings:

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

## Alternative: Using Local Installation

If you installed it locally in your project:

```json
{
  "mcpServers": {
    "figma": {
      "command": "node",
      "args": [
        "./node_modules/mcp-figma/dist/index.js"
      ]
    }
  }
}
```

## Steps to Set Up

1. **Get Figma Token**:
   - Go to https://www.figma.com/settings
   - Create a Personal Access Token
   - Copy the token

2. **Install MCP Server** (already installed locally):
   ```bash
   npm install mcp-figma
   ```
   ✅ Already installed in your project!

3. **Add Configuration**:
   - Open Cursor settings
   - Add the MCP server configuration above
   - Replace `your_figma_token_here` with your actual token

4. **Restart Cursor**:
   - Close and reopen Cursor
   - The MCP server should connect automatically

5. **Verify Connection**:
   - Check Cursor's MCP status (usually in the status bar or settings)
   - Try using MCP commands in chat

## Available MCP Commands (if server supports them)

Once connected, you might be able to use:
- `figma_get_file` - Fetch a Figma file
- `figma_get_images` - Export images from Figma
- `figma_get_components` - List components
- `figma_get_styles` - Get design tokens

## Troubleshooting

- **Server not found**: Make sure the package is installed globally
- **Token invalid**: Verify your Figma token is correct
- **Connection failed**: Check Cursor's console/logs for errors
- **Commands not available**: The MCP server might not be fully implemented yet

## Manual Integration Alternative

If MCP doesn't work, you can use the Figma API directly:
- See `src/lib/figma/api.ts` for utility functions
- Use environment variables for the token
- Call Figma API endpoints directly


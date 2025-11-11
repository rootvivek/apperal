# Figma MCP Setup Guide

This guide will help you connect Figma to Cursor using Model Context Protocol (MCP).

## Prerequisites

1. **Figma Account** with API access
2. **Figma Personal Access Token**

## Step 1: Get Your Figma API Token

1. Go to [Figma Account Settings](https://www.figma.com/settings)
2. Scroll down to "Personal Access Tokens"
3. Click "Create new token"
4. Give it a name (e.g., "Cursor MCP")
5. Copy the token (you won't see it again!)

## Step 2: Install Figma MCP Server

There are a few options for Figma MCP servers:

### Option A: mcp-figma (Recommended - Already Installed!)
```bash
npm install mcp-figma
```
✅ **Already installed in your project!**

### Option B: Cursor-specific Figma MCP
```bash
npm install cursor-talk-to-figma-mcp
```

### Option C: Build Your Own
You can create a custom MCP server using the Figma API.

## Step 3: Configure MCP in Cursor

1. Open Cursor Settings
2. Go to "Features" → "Model Context Protocol" or "MCP"
3. Add a new MCP server with this configuration:

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

**Note**: The API key will be set interactively when you first use the MCP server. You can also set it manually by telling the AI:
```
Please use mcp-figma to set my Figma API key: figd_xxxxxxxxxxxxxxxxxxxxxxx
```

Or if using local installation:

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

## Step 4: Restart Cursor

After adding the configuration, restart Cursor to load the MCP server.

## Step 5: Test the Connection

Once connected, you can:
- Fetch Figma files
- Get design tokens (colors, typography, spacing)
- Export assets
- Sync design changes

## Alternative: Manual Figma API Integration

If MCP server isn't available, you can create a simple integration:

1. Create a `.env.local` file:
```
FIGMA_ACCESS_TOKEN=your_token_here
FIGMA_FILE_KEY=your_file_key_here
```

2. Install Figma API client:
```bash
npm install @figma/rest-api-spec
```

3. Create API utility functions to fetch designs

## Troubleshooting

- **Token not working**: Make sure the token has the right permissions
- **MCP server not found**: Check if the package name is correct
- **Connection failed**: Verify the token is set correctly in env variables

## Useful Commands

Once connected, you can use MCP commands like:
- `fetch_figma_file` - Get a Figma file
- `get_figma_components` - List components
- `export_figma_assets` - Export images/assets
- `get_figma_styles` - Get design tokens

## Resources

- [Figma API Documentation](https://www.figma.com/developers/api)
- [MCP Documentation](https://modelcontextprotocol.io)
- [Figma Personal Access Tokens](https://www.figma.com/developers/api#access-tokens)


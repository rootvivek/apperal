# Figma MCP Setup - Complete Configuration

## ✅ What's Done:

1. ✅ **Package Installed**: `mcp-figma` is in your project
2. ✅ **API Key Configured**: Your token is saved to `~/.mcp-figma/config.json`

## 🔧 Final Step: Configure Cursor MCP

You need to add the MCP server configuration to Cursor:

### Option 1: Using npx (Recommended)

1. Open Cursor Settings (`Cmd + ,` on Mac, `Ctrl + ,` on Windows)
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

### Option 2: Using Local Installation

```json
{
  "mcpServers": {
    "figma": {
      "command": "node",
      "args": [
        "./node_modules/mcp-figma/build/index.js"
      ],
      "cwd": "/Users/a90850/Desktop/Apperal"
    }
  }
}
```

## 🔄 Restart Cursor

After adding the configuration:
1. **Close Cursor completely**
2. **Reopen Cursor**
3. The MCP server should connect automatically

## ✅ Verify Connection

Once Cursor restarts, you can test by asking me:
- "Get my Figma files"
- "Check my Figma API key status"
- "List my Figma teams"

## 🎯 Available Commands

Once connected, I can help you:
- **Get Files**: Fetch Figma files and designs
- **Export Images**: Get images from Figma designs
- **Get Components**: List and access Figma components
- **Get Styles**: Extract design tokens (colors, typography, spacing)
- **Manage Comments**: Add/remove comments on designs
- **Team Management**: Access team projects and files

## 📝 Your API Key

Your Figma API key is stored at:
```
~/.mcp-figma/config.json
```

The key starts with: `figd_3cRz07...`

## 🚀 Next Steps

1. Add the MCP configuration to Cursor (see above)
2. Restart Cursor
3. Start using Figma designs in your code!

---

**Need help?** Once you've configured Cursor and restarted, I can help you fetch Figma files and convert designs to code!


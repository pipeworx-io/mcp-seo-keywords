# mcp-seo-keywords

SEO Keywords MCP — search volume & difficulty via DataForSEO Labs (dataforseo.com)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `seo_keyword_overview` | Monthly search volume & difficulty for `<keyword>` — returns Google search volume, keyword difficulty (0-100), CPC, and competition for up to 10 keywords at once. Keyword research for SEO. Example: seo_keyword_overview({ keywords: ["running shoes", "trail shoes"], location_code: 2840, _apiKey: "your-base64-key" }) |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "seo-keywords": {
      "url": "https://gateway.pipeworx.io/seo-keywords/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Seo Keywords data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT

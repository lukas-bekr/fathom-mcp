# Fathom MCP Server

MCP (Model Context Protocol) server for the Fathom.video API, enabling LLMs to interact with Fathom's meeting recording and management features.

## Project Overview

This project implements an MCP server that exposes Fathom's REST API as tools that can be used by Claude and other LLM-powered assistants.

## Technology Stack

- **Language**: TypeScript
- **Framework**: MCP TypeScript SDK (`@modelcontextprotocol/sdk`)
- **Transport**: stdio (for local integration with Claude Desktop)
- **Validation**: Zod for runtime schema validation
- **HTTP Client**: Axios

## Environment Variables

- `FATHOM_API_KEY` (required): Your Fathom API key from the Fathom website settings

## Available Tools

### Core API Tools (7)
1. `fathom_list_meetings` - List meetings with filtering and pagination
2. `fathom_get_summary` - Get meeting summary by recording ID
3. `fathom_get_transcript` - Get meeting transcript by recording ID
4. `fathom_list_teams` - List all teams
5. `fathom_list_team_members` - List team members
6. `fathom_create_webhook` - Create a webhook for notifications
7. `fathom_delete_webhook` - Delete a webhook

### Helper Tools (3)
8. `fathom_search_meetings` - Search across meeting transcripts and summaries
9. `fathom_meeting_stats` - Get meeting analytics and statistics
10. `fathom_participant_stats` - Get participant frequency analytics

## Project Structure

```
fathom-mcp/
├── src/
│   ├── index.ts           # Main entry point with MCP server
│   ├── types.ts           # TypeScript interfaces
│   ├── constants.ts       # API URL, limits
│   ├── schemas/           # Zod validation schemas
│   ├── services/          # API client
│   └── tools/             # Tool implementations
├── dist/                  # Compiled output
├── package.json
├── tsconfig.json
├── README.md
├── PRD.md                 # Project requirements
├── CHANGELOG.md           # Version history
└── TODO.md                # Task tracking
```

## Development Commands

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm run dev          # Development with auto-reload
npm start            # Run the server
```

## Fathom API Reference

- **Base URL**: `https://api.fathom.ai/external/v1`
- **Auth**: API Key via `X-Api-Key` header
- **Rate Limit**: 60 requests per 60 seconds

## Claude Desktop Configuration

Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "fathom": {
      "command": "node",
      "args": ["/path/to/fathom-mcp/dist/index.js"],
      "env": {
        "FATHOM_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

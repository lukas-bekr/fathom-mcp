# Fathom MCP Server

An MCP (Model Context Protocol) server that enables LLMs to interact with the [Fathom.video](https://fathom.video) API for meeting recording management, transcripts, summaries, and analytics.

## Features

- **List and filter meetings** - Access your Fathom meeting recordings with powerful filtering
- **Get transcripts and summaries** - Retrieve AI-generated summaries and full transcripts
- **Team management** - List teams and team members in your organization
- **Webhook management** - Create and delete webhooks for real-time notifications
- **Search meetings** - Full-text search across meeting content
- **Analytics** - Get meeting statistics and participant insights

## Installation

```bash
# Clone or download the repository
git clone <repository-url>
cd fathom-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

### Get Your Fathom API Key

1. Log in to [Fathom](https://fathom.video)
2. Go to Settings > API
3. Generate or copy your API key

### Claude Desktop Setup

Add the following to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "fathom": {
      "command": "node",
      "args": ["/absolute/path/to/fathom-mcp/dist/index.js"],
      "env": {
        "FATHOM_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Environment Variable

Alternatively, set the environment variable:

```bash
export FATHOM_API_KEY=your-api-key-here
```

## Available Tools

### Core API Tools

| Tool | Description |
|------|-------------|
| `fathom_list_meetings` | List meetings with filtering by date, team, domain, recorder |
| `fathom_get_summary` | Get AI-generated summary for a recording |
| `fathom_get_transcript` | Get full transcript with speaker identification |
| `fathom_list_teams` | List all teams in your organization |
| `fathom_list_team_members` | List members of a specific team |
| `fathom_create_webhook` | Create a webhook for meeting notifications |
| `fathom_delete_webhook` | Delete an existing webhook |

### Helper Tools

| Tool | Description |
|------|-------------|
| `fathom_search_meetings` | Search across meeting titles, transcripts, and summaries |
| `fathom_meeting_stats` | Get analytics: duration stats, team breakdown, meeting types |
| `fathom_participant_stats` | Get participant frequency and domain analysis |

## Usage Examples

### List Recent Meetings

```
"Show me my recent meetings"
```

### Get Meeting Summary

```
"Get the summary for recording 123456789"
```

### Search Meetings

```
"Search my meetings for discussions about 'quarterly budget'"
```

### Filter by Team

```
"List all Sales team meetings from last month"
```

### Get Analytics

```
"Show me meeting statistics for this quarter"
```

### Create a Webhook

```
"Create a webhook to https://my-app.com/webhook for my recordings"
```

## Response Formats

All tools support two response formats:

- **markdown** (default): Human-readable formatted output
- **json**: Structured data for programmatic processing

Specify the format using the `response_format` parameter.

## Rate Limits

The Fathom API has a rate limit of 60 requests per minute. The server handles rate limiting gracefully and will return an error message if the limit is exceeded.

## Development

```bash
# Install dependencies
npm install

# Development with auto-reload
npm run dev

# Build
npm run build

# Type checking
npm run typecheck

# Run the server
npm start
```

## Project Structure

```
fathom-mcp/
├── src/
│   ├── index.ts           # Main entry point
│   ├── types.ts           # TypeScript interfaces
│   ├── constants.ts       # Configuration constants
│   ├── schemas/           # Zod validation schemas
│   ├── services/          # API client
│   └── tools/             # Tool implementations
├── dist/                  # Compiled output
├── package.json
├── tsconfig.json
├── PRD.md                 # Project requirements
├── CHANGELOG.md           # Version history
└── README.md
```

## Error Handling

The server provides clear, actionable error messages:

- **401**: Authentication failed - check your API key
- **404**: Resource not found - verify the recording ID
- **429**: Rate limit exceeded - wait before retrying
- **Network errors**: Connection issues with Fathom API

## License

MIT

## Links

- [Fathom.video](https://fathom.video)
- [Fathom API Documentation](https://fathom-e4df0608.mintlify.app/api-overview)
- [MCP Protocol](https://modelcontextprotocol.io)

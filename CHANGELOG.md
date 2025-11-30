# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-30

### Added
- Initial release of Fathom MCP Server
- Core API tools:
  - `fathom_list_meetings` - List meetings with filtering by date, team, domain, recorder
  - `fathom_get_summary` - Get AI-generated meeting summaries
  - `fathom_get_transcript` - Get full meeting transcripts with speaker identification
  - `fathom_list_teams` - List all teams in organization
  - `fathom_list_team_members` - List members of a specific team
  - `fathom_create_webhook` - Create webhooks for meeting notifications
  - `fathom_delete_webhook` - Delete existing webhooks
- Helper tools:
  - `fathom_search_meetings` - Full-text search across meeting titles, transcripts, and summaries
  - `fathom_meeting_stats` - Meeting analytics with duration stats and team breakdown
  - `fathom_participant_stats` - Participant frequency and domain analysis
- TypeScript implementation with strict type checking
- Zod validation schemas for all tool inputs
- stdio transport for Claude Desktop integration
- Markdown and JSON response formats
- Comprehensive error handling with actionable messages
- Full documentation (README.md, PRD.md, CLAUDE.md)

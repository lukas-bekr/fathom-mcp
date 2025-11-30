#!/usr/bin/env node
/**
 * Fathom MCP Server
 *
 * An MCP server that enables LLMs to interact with the Fathom.video API
 * for meeting recording management, transcripts, summaries, and analytics.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initializeApiClient } from "./services/api-client.js";
import { registerMeetingTools } from "./tools/meetings.js";
import { registerRecordingTools } from "./tools/recordings.js";
import { registerTeamTools } from "./tools/teams.js";
import { registerWebhookTools } from "./tools/webhooks.js";
import { registerAnalyticsTools } from "./tools/analytics.js";

// Server metadata
const SERVER_NAME = "fathom-mcp-server";
const SERVER_VERSION = "0.1.0";

/**
 * Main entry point
 */
async function main(): Promise<void> {
  // Check for API key
  const apiKey = process.env.FATHOM_API_KEY;
  if (!apiKey) {
    console.error("ERROR: FATHOM_API_KEY environment variable is required");
    console.error("");
    console.error("To use this MCP server, you need to:");
    console.error("1. Get your API key from Fathom (Settings > API)");
    console.error("2. Set the environment variable:");
    console.error("   export FATHOM_API_KEY=your-api-key-here");
    console.error("");
    console.error("Or configure it in Claude Desktop's config.json:");
    console.error(JSON.stringify({
      mcpServers: {
        fathom: {
          command: "node",
          args: ["/path/to/fathom-mcp/dist/index.js"],
          env: {
            FATHOM_API_KEY: "your-api-key-here"
          }
        }
      }
    }, null, 2));
    process.exit(1);
  }

  // Initialize API client
  initializeApiClient(apiKey);

  // Create MCP server
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION
  });

  // Register all tools
  registerMeetingTools(server);
  registerRecordingTools(server);
  registerTeamTools(server);
  registerWebhookTools(server);
  registerAnalyticsTools(server);

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (not stdout, as stdout is used for MCP communication)
  console.error(`${SERVER_NAME} v${SERVER_VERSION} running`);
  console.error("Available tools:");
  console.error("  - fathom_list_meetings: List and filter meetings");
  console.error("  - fathom_get_summary: Get meeting summary");
  console.error("  - fathom_get_transcript: Get meeting transcript");
  console.error("  - fathom_list_teams: List teams");
  console.error("  - fathom_list_team_members: List team members");
  console.error("  - fathom_create_webhook: Create a webhook");
  console.error("  - fathom_delete_webhook: Delete a webhook");
  console.error("  - fathom_search_meetings: Search meeting content");
  console.error("  - fathom_meeting_stats: Get meeting analytics");
  console.error("  - fathom_participant_stats: Get participant analytics");
}

// Run the server
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

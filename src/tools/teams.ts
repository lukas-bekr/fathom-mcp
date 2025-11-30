/**
 * Team tools implementation
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, handleApiError } from "../services/api-client.js";
import {
  ListTeamsInputSchema,
  ListTeamMembersInputSchema,
  type ListTeamsInput,
  type ListTeamMembersInput
} from "../schemas/teams.js";
import { ResponseFormat } from "../constants.js";
import type { TeamsResponse, TeamMembersResponse, Team, TeamMember } from "../types.js";

/**
 * Format teams for markdown output
 */
function formatTeamsMarkdown(teams: Team[]): string {
  const lines: string[] = [
    "# Fathom Teams",
    "",
    `Found ${teams.length} team${teams.length !== 1 ? "s" : ""}`,
    ""
  ];

  if (teams.length === 0) {
    lines.push("*No teams found.*");
    return lines.join("\n");
  }

  lines.push("| Team Name | Created |");
  lines.push("|-----------|---------|");

  for (const team of teams) {
    const createdDate = new Date(team.created_at).toLocaleDateString();
    lines.push(`| ${team.name} | ${createdDate} |`);
  }

  return lines.join("\n");
}

/**
 * Format team members for markdown output
 */
function formatTeamMembersMarkdown(members: TeamMember[], teamFilter?: string): string {
  const lines: string[] = [
    teamFilter ? `# Team Members: ${teamFilter}` : "# All Team Members",
    "",
    `Found ${members.length} member${members.length !== 1 ? "s" : ""}`,
    ""
  ];

  if (members.length === 0) {
    lines.push("*No team members found.*");
    return lines.join("\n");
  }

  lines.push("| Name | Email | Joined |");
  lines.push("|------|-------|--------|");

  for (const member of members) {
    const joinedDate = new Date(member.created_at).toLocaleDateString();
    lines.push(`| ${member.name} | ${member.email} | ${joinedDate} |`);
  }

  return lines.join("\n");
}

/**
 * Register team tools with the MCP server
 */
export function registerTeamTools(server: McpServer): void {
  // List Teams tool
  server.registerTool(
    "fathom_list_teams",
    {
      title: "List Fathom Teams",
      description: `List all teams accessible to the authenticated user in Fathom.

This tool retrieves the list of teams in your Fathom workspace. Teams are used to organize recordings and control access to meeting content.

Args:
  - cursor (string): Pagination cursor from previous response
  - response_format ('markdown'|'json'): Output format (default: 'markdown')

Returns:
  Paginated list of teams with:
  - name: Team name
  - created_at: When the team was created

Examples:
  - List all teams: {}
  - Get as JSON: { response_format: 'json' }
  - Next page: { cursor: 'eyJwYWdlX251bSI6Mn0=' }`,
      inputSchema: ListTeamsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: ListTeamsInput) => {
      try {
        const queryParams: Record<string, unknown> = {};
        if (params.cursor) queryParams.cursor = params.cursor;

        const response = await apiGet<TeamsResponse>("/teams", queryParams);

        const output = {
          total_returned: response.items.length,
          has_more: !!response.next_cursor,
          next_cursor: response.next_cursor,
          teams: response.items
        };

        let textContent: string;

        if (params.response_format === ResponseFormat.JSON) {
          textContent = JSON.stringify(output, null, 2);
        } else {
          textContent = formatTeamsMarkdown(response.items);

          if (response.next_cursor) {
            textContent += `\n\n*Use cursor \`${response.next_cursor}\` to load more results*`;
          }
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true
        };
      }
    }
  );

  // List Team Members tool
  server.registerTool(
    "fathom_list_team_members",
    {
      title: "List Fathom Team Members",
      description: `List members of a specific team or all teams in Fathom.

This tool retrieves team member information including names, emails, and when they joined.

Args:
  - team (string): Filter by team name (optional - shows all members if not specified)
  - cursor (string): Pagination cursor from previous response
  - response_format ('markdown'|'json'): Output format (default: 'markdown')

Returns:
  Paginated list of team members with:
  - name: Member's display name
  - email: Member's email address
  - created_at: When the member was added

Examples:
  - List all members: {}
  - Filter by team: { team: 'Sales' }
  - Get as JSON: { response_format: 'json' }`,
      inputSchema: ListTeamMembersInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: ListTeamMembersInput) => {
      try {
        const queryParams: Record<string, unknown> = {};
        if (params.team) queryParams.team = params.team;
        if (params.cursor) queryParams.cursor = params.cursor;

        const response = await apiGet<TeamMembersResponse>("/team_members", queryParams);

        const output = {
          total_returned: response.items.length,
          has_more: !!response.next_cursor,
          next_cursor: response.next_cursor,
          team_filter: params.team || null,
          members: response.items
        };

        let textContent: string;

        if (params.response_format === ResponseFormat.JSON) {
          textContent = JSON.stringify(output, null, 2);
        } else {
          textContent = formatTeamMembersMarkdown(response.items, params.team);

          if (response.next_cursor) {
            textContent += `\n\n*Use cursor \`${response.next_cursor}\` to load more results*`;
          }
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleApiError(error) }],
          isError: true
        };
      }
    }
  );
}

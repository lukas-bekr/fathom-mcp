/**
 * Meeting tools implementation
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, handleApiError } from "../services/api-client.js";
import { ListMeetingsInputSchema, type ListMeetingsInput } from "../schemas/meetings.js";
import { ResponseFormat, CHARACTER_LIMIT } from "../constants.js";
import type { MeetingsResponse, Meeting } from "../types.js";

/**
 * Format a meeting for markdown output
 */
function formatMeetingMarkdown(meeting: Meeting, includeDetails: boolean = false): string {
  const lines: string[] = [];

  lines.push(`## ${meeting.title}`);
  if (meeting.meeting_title && meeting.meeting_title !== meeting.title) {
    lines.push(`*Calendar event: ${meeting.meeting_title}*`);
  }
  lines.push("");

  lines.push(`- **Recording ID**: ${meeting.recording_id}`);
  lines.push(`- **Date**: ${new Date(meeting.created_at).toLocaleString()}`);
  lines.push(`- **Duration**: ${formatDuration(meeting.recording_start_time, meeting.recording_end_time)}`);
  lines.push(`- **Recorded by**: ${meeting.recorded_by.name} (${meeting.recorded_by.email})`);
  if (meeting.recorded_by.team) {
    lines.push(`- **Team**: ${meeting.recorded_by.team}`);
  }
  lines.push(`- **Type**: ${meeting.calendar_invitees_domains_type === "one_or_more_external" ? "External" : "Internal"}`);
  lines.push(`- **URL**: ${meeting.url}`);
  lines.push("");

  // Participants
  if (meeting.calendar_invitees.length > 0) {
    lines.push("### Participants");
    for (const invitee of meeting.calendar_invitees) {
      const external = invitee.is_external ? " (external)" : "";
      lines.push(`- ${invitee.name} <${invitee.email}>${external}`);
    }
    lines.push("");
  }

  if (includeDetails) {
    // Summary
    if (meeting.default_summary?.markdown_formatted) {
      lines.push("### Summary");
      lines.push(meeting.default_summary.markdown_formatted);
      lines.push("");
    }

    // Action items
    if (meeting.action_items && meeting.action_items.length > 0) {
      lines.push("### Action Items");
      for (const item of meeting.action_items) {
        const status = item.completed ? "[x]" : "[ ]";
        const assignee = item.assignee ? ` (@${item.assignee.name})` : "";
        lines.push(`- ${status} ${item.description}${assignee}`);
      }
      lines.push("");
    }

    // Transcript preview
    if (meeting.transcript && meeting.transcript.length > 0) {
      lines.push("### Transcript Preview");
      const preview = meeting.transcript.slice(0, 5);
      for (const entry of preview) {
        lines.push(`**${entry.speaker.display_name}** (${entry.timestamp}): ${entry.text}`);
      }
      if (meeting.transcript.length > 5) {
        lines.push(`*... and ${meeting.transcript.length - 5} more entries*`);
      }
      lines.push("");
    }

    // CRM matches
    if (meeting.crm_matches) {
      if (meeting.crm_matches.error) {
        lines.push(`*CRM: ${meeting.crm_matches.error}*`);
      } else {
        const hasMatches =
          (meeting.crm_matches.contacts?.length || 0) +
          (meeting.crm_matches.companies?.length || 0) +
          (meeting.crm_matches.deals?.length || 0) > 0;

        if (hasMatches) {
          lines.push("### CRM Matches");
          if (meeting.crm_matches.contacts?.length) {
            lines.push("**Contacts:**");
            for (const contact of meeting.crm_matches.contacts) {
              lines.push(`- [${contact.name}](${contact.record_url})`);
            }
          }
          if (meeting.crm_matches.companies?.length) {
            lines.push("**Companies:**");
            for (const company of meeting.crm_matches.companies) {
              lines.push(`- [${company.name}](${company.record_url})`);
            }
          }
          if (meeting.crm_matches.deals?.length) {
            lines.push("**Deals:**");
            for (const deal of meeting.crm_matches.deals) {
              lines.push(`- [${deal.name}](${deal.record_url}) - $${deal.amount.toLocaleString()}`);
            }
          }
          lines.push("");
        }
      }
    }
  }

  return lines.join("\n");
}

/**
 * Calculate duration between two timestamps
 */
function formatDuration(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const durationMs = endDate.getTime() - startDate.getTime();
  const minutes = Math.round(durationMs / 60000);

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Register meeting tools with the MCP server
 */
export function registerMeetingTools(server: McpServer): void {
  server.registerTool(
    "fathom_list_meetings",
    {
      title: "List Fathom Meetings",
      description: `List meetings from Fathom with optional filtering and pagination.

This tool retrieves meeting recordings from your Fathom account. You can filter by:
- Company domains of calendar invitees
- Internal vs external meetings
- Date range (created_after/created_before)
- Recorder email addresses
- Team names

You can optionally include:
- AI-generated summaries
- Full transcripts
- Action items
- CRM matches (contacts, companies, deals)

Args:
  - calendar_invitees_domains (string[]): Filter by company domains
  - calendar_invitees_domains_type ('all'|'only_internal'|'one_or_more_external'): Filter by meeting type
  - created_after (string): ISO 8601 timestamp to filter meetings after
  - created_before (string): ISO 8601 timestamp to filter meetings before
  - cursor (string): Pagination cursor from previous response
  - include_action_items (boolean): Include action items (default: false)
  - include_crm_matches (boolean): Include CRM matches (default: false)
  - include_summary (boolean): Include summaries (default: false)
  - include_transcript (boolean): Include transcripts (default: false)
  - recorded_by (string[]): Filter by recorder emails
  - teams (string[]): Filter by team names
  - response_format ('markdown'|'json'): Output format (default: 'markdown')

Returns:
  Paginated list of meetings with requested details.

Examples:
  - List recent meetings: {}
  - External meetings only: { calendar_invitees_domains_type: 'one_or_more_external' }
  - With summaries: { include_summary: true }
  - Filter by team: { teams: ['Sales'] }`,
      inputSchema: ListMeetingsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: ListMeetingsInput) => {
      try {
        const queryParams: Record<string, unknown> = {};

        if (params.calendar_invitees_domains?.length) {
          queryParams.calendar_invitees_domains = params.calendar_invitees_domains;
        }
        if (params.calendar_invitees_domains_type && params.calendar_invitees_domains_type !== "all") {
          queryParams.calendar_invitees_domains_type = params.calendar_invitees_domains_type;
        }
        if (params.created_after) queryParams.created_after = params.created_after;
        if (params.created_before) queryParams.created_before = params.created_before;
        if (params.cursor) queryParams.cursor = params.cursor;
        if (params.include_action_items) queryParams.include_action_items = true;
        if (params.include_crm_matches) queryParams.include_crm_matches = true;
        if (params.include_summary) queryParams.include_summary = true;
        if (params.include_transcript) queryParams.include_transcript = true;
        if (params.recorded_by?.length) queryParams.recorded_by = params.recorded_by;
        if (params.teams?.length) queryParams.teams = params.teams;

        const response = await apiGet<MeetingsResponse>("/meetings", queryParams);

        const includeDetails = params.include_summary || params.include_transcript ||
          params.include_action_items || params.include_crm_matches;

        // Build structured output
        const output = {
          total_returned: response.items.length,
          has_more: !!response.next_cursor,
          next_cursor: response.next_cursor,
          meetings: response.items.map(m => ({
            recording_id: m.recording_id,
            title: m.title,
            created_at: m.created_at,
            duration_minutes: Math.round(
              (new Date(m.recording_end_time).getTime() - new Date(m.recording_start_time).getTime()) / 60000
            ),
            recorded_by: m.recorded_by,
            participants_count: m.calendar_invitees.length,
            type: m.calendar_invitees_domains_type,
            url: m.url,
            ...(params.include_summary && m.default_summary ? { summary: m.default_summary } : {}),
            ...(params.include_transcript && m.transcript ? { transcript: m.transcript } : {}),
            ...(params.include_action_items && m.action_items ? { action_items: m.action_items } : {}),
            ...(params.include_crm_matches && m.crm_matches ? { crm_matches: m.crm_matches } : {})
          }))
        };

        let textContent: string;

        if (params.response_format === ResponseFormat.JSON) {
          textContent = JSON.stringify(output, null, 2);
        } else {
          // Markdown format
          const lines: string[] = [
            "# Fathom Meetings",
            "",
            `Found ${response.items.length} meetings${response.next_cursor ? " (more available)" : ""}`,
            ""
          ];

          for (const meeting of response.items) {
            lines.push(formatMeetingMarkdown(meeting, includeDetails));
            lines.push("---");
            lines.push("");
          }

          if (response.next_cursor) {
            lines.push(`*Use cursor \`${response.next_cursor}\` to load more results*`);
          }

          textContent = lines.join("\n");
        }

        // Check character limit
        if (textContent.length > CHARACTER_LIMIT) {
          const truncatedOutput = {
            ...output,
            meetings: output.meetings.slice(0, Math.ceil(output.meetings.length / 2)),
            truncated: true,
            truncation_message: `Response truncated. Use cursor-based pagination or add filters to see more results.`
          };
          textContent = params.response_format === ResponseFormat.JSON
            ? JSON.stringify(truncatedOutput, null, 2)
            : `*Response truncated due to size. Showing ${truncatedOutput.meetings.length} of ${output.meetings.length} meetings.*\n\n` + textContent.slice(0, CHARACTER_LIMIT - 200);
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

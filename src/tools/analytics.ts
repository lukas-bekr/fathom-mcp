/**
 * Analytics and search helper tools implementation
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, handleApiError } from "../services/api-client.js";
import {
  SearchMeetingsInputSchema,
  MeetingStatsInputSchema,
  ParticipantStatsInputSchema,
  type SearchMeetingsInput,
  type MeetingStatsInput,
  type ParticipantStatsInput
} from "../schemas/meetings.js";
import { ResponseFormat, CHARACTER_LIMIT } from "../constants.js";
import type {
  MeetingsResponse,
  Meeting,
  MeetingStats,
  ParticipantStats,
  SearchResult,
  DurationStats
} from "../types.js";

/**
 * Search for text in meeting content
 */
function searchInMeeting(meeting: Meeting, query: string): SearchResult | null {
  const lowerQuery = query.toLowerCase();
  const contextSnippets: string[] = [];

  // Search in title
  const inTitle = meeting.title.toLowerCase().includes(lowerQuery) ||
    (meeting.meeting_title?.toLowerCase().includes(lowerQuery) ?? false);

  // Search in transcript
  let inTranscript = false;
  if (meeting.transcript) {
    for (const entry of meeting.transcript) {
      if (entry.text.toLowerCase().includes(lowerQuery)) {
        inTranscript = true;
        // Extract context snippet
        const text = entry.text;
        const index = text.toLowerCase().indexOf(lowerQuery);
        const start = Math.max(0, index - 50);
        const end = Math.min(text.length, index + query.length + 50);
        let snippet = text.slice(start, end);
        if (start > 0) snippet = "..." + snippet;
        if (end < text.length) snippet = snippet + "...";
        contextSnippets.push(`[${entry.timestamp}] ${entry.speaker.display_name}: ${snippet}`);

        // Limit snippets
        if (contextSnippets.length >= 3) break;
      }
    }
  }

  // Search in summary
  let inSummary = false;
  if (meeting.default_summary?.markdown_formatted) {
    inSummary = meeting.default_summary.markdown_formatted.toLowerCase().includes(lowerQuery);
    if (inSummary && contextSnippets.length < 3) {
      const text = meeting.default_summary.markdown_formatted;
      const index = text.toLowerCase().indexOf(lowerQuery);
      const start = Math.max(0, index - 50);
      const end = Math.min(text.length, index + query.length + 50);
      let snippet = text.slice(start, end);
      if (start > 0) snippet = "..." + snippet;
      if (end < text.length) snippet = snippet + "...";
      contextSnippets.push(`[Summary] ${snippet}`);
    }
  }

  if (!inTitle && !inTranscript && !inSummary) {
    return null;
  }

  return {
    meeting,
    matches: {
      in_title: inTitle,
      in_transcript: inTranscript,
      in_summary: inSummary,
      context_snippets: contextSnippets
    }
  };
}

/**
 * Calculate duration in minutes between two timestamps
 */
function getDurationMinutes(start: string, end: string): number {
  return Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 60000
  );
}

/**
 * Fetch all meetings with pagination
 */
async function fetchAllMeetings(params: {
  created_after?: string;
  created_before?: string;
  teams?: string[];
  include_transcript?: boolean;
  include_summary?: boolean;
}): Promise<Meeting[]> {
  const allMeetings: Meeting[] = [];
  let cursor: string | undefined = undefined;
  let pageCount = 0;
  const maxPages = 10; // Safety limit

  do {
    const queryParams: Record<string, unknown> = {};
    if (params.created_after) queryParams.created_after = params.created_after;
    if (params.created_before) queryParams.created_before = params.created_before;
    if (params.teams?.length) queryParams.teams = params.teams;
    if (params.include_transcript) queryParams.include_transcript = true;
    if (params.include_summary) queryParams.include_summary = true;
    if (cursor) queryParams.cursor = cursor;

    const response = await apiGet<MeetingsResponse>("/meetings", queryParams);
    allMeetings.push(...response.items);
    cursor = response.next_cursor ?? undefined;
    pageCount++;
  } while (cursor && pageCount < maxPages);

  return allMeetings;
}

/**
 * Register analytics tools with the MCP server
 */
export function registerAnalyticsTools(server: McpServer): void {
  // Search Meetings tool
  server.registerTool(
    "fathom_search_meetings",
    {
      title: "Search Fathom Meetings",
      description: `Search across Fathom meeting titles, transcripts, and summaries.

This tool performs a text search across your meeting content to find relevant discussions, mentions, or topics.

Args:
  - query (string, required): Search string (2-200 characters)
  - created_after (string): Filter to meetings after this ISO 8601 timestamp
  - created_before (string): Filter to meetings before this ISO 8601 timestamp
  - teams (string[]): Filter by team names
  - limit (number): Max results to return (1-50, default: 10)
  - response_format ('markdown'|'json'): Output format (default: 'markdown')

Returns:
  Matching meetings with:
  - Meeting details
  - Where matches were found (title, transcript, summary)
  - Context snippets showing the matched text

Examples:
  - Search for topic: { query: 'quarterly budget' }
  - With date filter: { query: 'product launch', created_after: '2024-01-01T00:00:00Z' }
  - Limit results: { query: 'feature request', limit: 5 }

Notes:
  - Search is case-insensitive
  - Searches across transcripts and summaries (fetched automatically)
  - Limited to most recent meetings for performance`,
      inputSchema: SearchMeetingsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: SearchMeetingsInput) => {
      try {
        // Fetch meetings with transcripts and summaries for search
        const meetings = await fetchAllMeetings({
          created_after: params.created_after,
          created_before: params.created_before,
          teams: params.teams,
          include_transcript: true,
          include_summary: true
        });

        // Search through meetings
        const results: SearchResult[] = [];
        for (const meeting of meetings) {
          const result = searchInMeeting(meeting, params.query);
          if (result) {
            results.push(result);
            if (results.length >= (params.limit || 10)) break;
          }
        }

        const output = {
          query: params.query,
          total_searched: meetings.length,
          matches_found: results.length,
          results: results.map(r => ({
            recording_id: r.meeting.recording_id,
            title: r.meeting.title,
            created_at: r.meeting.created_at,
            recorded_by: r.meeting.recorded_by.name,
            url: r.meeting.url,
            matches: r.matches
          }))
        };

        let textContent: string;

        if (params.response_format === ResponseFormat.JSON) {
          textContent = JSON.stringify(output, null, 2);
        } else {
          const lines: string[] = [
            `# Search Results: "${params.query}"`,
            "",
            `Searched ${meetings.length} meetings, found ${results.length} matches`,
            ""
          ];

          if (results.length === 0) {
            lines.push("*No matches found. Try different search terms or adjust filters.*");
          } else {
            for (const result of results) {
              lines.push(`## ${result.meeting.title}`);
              lines.push(`**Recording ID**: ${result.meeting.recording_id}`);
              lines.push(`**Date**: ${new Date(result.meeting.created_at).toLocaleString()}`);
              lines.push(`**URL**: ${result.meeting.url}`);
              lines.push("");

              const matchLocations: string[] = [];
              if (result.matches.in_title) matchLocations.push("title");
              if (result.matches.in_transcript) matchLocations.push("transcript");
              if (result.matches.in_summary) matchLocations.push("summary");
              lines.push(`*Found in: ${matchLocations.join(", ")}*`);
              lines.push("");

              if (result.matches.context_snippets.length > 0) {
                lines.push("**Context:**");
                for (const snippet of result.matches.context_snippets) {
                  lines.push(`> ${snippet}`);
                }
              }

              lines.push("");
              lines.push("---");
              lines.push("");
            }
          }

          textContent = lines.join("\n");
        }

        // Truncate if needed
        if (textContent.length > CHARACTER_LIMIT) {
          textContent = textContent.slice(0, CHARACTER_LIMIT - 100) +
            "\n\n*Results truncated. Use filters to narrow search.*";
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

  // Meeting Stats tool
  server.registerTool(
    "fathom_meeting_stats",
    {
      title: "Get Fathom Meeting Statistics",
      description: `Get analytics and statistics about your Fathom meetings.

This tool calculates aggregate statistics about your meetings including duration metrics, team breakdowns, and internal vs external meeting ratios.

Args:
  - created_after (string): Filter to meetings after this ISO 8601 timestamp
  - created_before (string): Filter to meetings before this ISO 8601 timestamp
  - teams (string[]): Filter by team names
  - response_format ('markdown'|'json'): Output format (default: 'markdown')

Returns:
  - total_meetings: Number of meetings analyzed
  - duration_stats: Average, min, max, and total meeting duration in minutes
  - meetings_by_team: Count of meetings per team
  - internal_vs_external: Breakdown of internal vs external meetings

Examples:
  - All time stats: {}
  - This month: { created_after: '2024-11-01T00:00:00Z' }
  - Sales team: { teams: ['Sales'] }

Notes:
  - Duration is calculated from recording start to end time
  - Team breakdown based on recorder's team
  - External = one or more external participants`,
      inputSchema: MeetingStatsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: MeetingStatsInput) => {
      try {
        const meetings = await fetchAllMeetings({
          created_after: params.created_after,
          created_before: params.created_before,
          teams: params.teams
        });

        if (meetings.length === 0) {
          return {
            content: [{
              type: "text",
              text: "No meetings found matching the specified criteria."
            }]
          };
        }

        // Calculate duration stats
        const durations = meetings.map(m =>
          getDurationMinutes(m.recording_start_time, m.recording_end_time)
        );
        const totalMinutes = durations.reduce((a, b) => a + b, 0);

        const durationStats: DurationStats = {
          average_minutes: Math.round(totalMinutes / meetings.length),
          min_minutes: Math.min(...durations),
          max_minutes: Math.max(...durations),
          total_minutes: totalMinutes
        };

        // Calculate meetings by team
        const meetingsByTeam: Record<string, number> = {};
        for (const meeting of meetings) {
          const team = meeting.recorded_by.team || "No Team";
          meetingsByTeam[team] = (meetingsByTeam[team] || 0) + 1;
        }

        // Calculate internal vs external
        const internal = meetings.filter(
          m => m.calendar_invitees_domains_type === "only_internal"
        ).length;
        const external = meetings.length - internal;

        const output: MeetingStats = {
          total_meetings: meetings.length,
          duration_stats: durationStats,
          meetings_by_team: meetingsByTeam,
          internal_vs_external: { internal, external }
        };

        let textContent: string;

        if (params.response_format === ResponseFormat.JSON) {
          textContent = JSON.stringify(output, null, 2);
        } else {
          const lines: string[] = [
            "# Meeting Statistics",
            ""
          ];

          if (params.created_after || params.created_before) {
            const dateRange = [
              params.created_after ? `from ${new Date(params.created_after).toLocaleDateString()}` : "",
              params.created_before ? `to ${new Date(params.created_before).toLocaleDateString()}` : ""
            ].filter(Boolean).join(" ");
            lines.push(`*Date range: ${dateRange}*`);
            lines.push("");
          }

          lines.push(`## Overview`);
          lines.push(`- **Total Meetings**: ${meetings.length}`);
          lines.push(`- **Total Time**: ${formatMinutes(totalMinutes)}`);
          lines.push("");

          lines.push(`## Duration Statistics`);
          lines.push(`- **Average**: ${durationStats.average_minutes} min`);
          lines.push(`- **Shortest**: ${durationStats.min_minutes} min`);
          lines.push(`- **Longest**: ${durationStats.max_minutes} min`);
          lines.push("");

          lines.push(`## Meeting Types`);
          lines.push(`- **Internal**: ${internal} (${Math.round(internal / meetings.length * 100)}%)`);
          lines.push(`- **External**: ${external} (${Math.round(external / meetings.length * 100)}%)`);
          lines.push("");

          lines.push(`## Meetings by Team`);
          const sortedTeams = Object.entries(meetingsByTeam)
            .sort(([, a], [, b]) => b - a);
          for (const [team, count] of sortedTeams) {
            lines.push(`- **${team}**: ${count}`);
          }

          textContent = lines.join("\n");
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

  // Participant Stats tool
  server.registerTool(
    "fathom_participant_stats",
    {
      title: "Get Fathom Participant Statistics",
      description: `Get analytics about meeting participants and recorders in Fathom.

This tool analyzes who attends your meetings most frequently and which domains are most common.

Args:
  - created_after (string): Filter to meetings after this ISO 8601 timestamp
  - created_before (string): Filter to meetings before this ISO 8601 timestamp
  - limit (number): Max top participants/recorders to return (1-100, default: 10)
  - response_format ('markdown'|'json'): Output format (default: 'markdown')

Returns:
  - top_participants: Most frequent meeting attendees
  - domain_breakdown: Meeting count by email domain
  - top_recorders: Users who record the most meetings

Examples:
  - All time stats: {}
  - Top 20: { limit: 20 }
  - This quarter: { created_after: '2024-10-01T00:00:00Z' }`,
      inputSchema: ParticipantStatsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: ParticipantStatsInput) => {
      try {
        const meetings = await fetchAllMeetings({
          created_after: params.created_after,
          created_before: params.created_before
        });

        if (meetings.length === 0) {
          return {
            content: [{
              type: "text",
              text: "No meetings found matching the specified criteria."
            }]
          };
        }

        // Count participants
        const participantCounts: Map<string, { name: string; email: string; count: number }> = new Map();
        const domainCounts: Map<string, number> = new Map();
        const recorderCounts: Map<string, { name: string; email: string; count: number }> = new Map();

        for (const meeting of meetings) {
          // Count participants
          for (const invitee of meeting.calendar_invitees) {
            const key = invitee.email.toLowerCase();
            const existing = participantCounts.get(key);
            if (existing) {
              existing.count++;
            } else {
              participantCounts.set(key, {
                name: invitee.name,
                email: invitee.email,
                count: 1
              });
            }

            // Count domains
            const domain = invitee.email_domain.toLowerCase();
            domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
          }

          // Count recorders
          const recorderKey = meeting.recorded_by.email.toLowerCase();
          const existingRecorder = recorderCounts.get(recorderKey);
          if (existingRecorder) {
            existingRecorder.count++;
          } else {
            recorderCounts.set(recorderKey, {
              name: meeting.recorded_by.name,
              email: meeting.recorded_by.email,
              count: 1
            });
          }
        }

        const limit = params.limit || 10;

        // Sort and limit
        const topParticipants = Array.from(participantCounts.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, limit)
          .map(p => ({ name: p.name, email: p.email, meeting_count: p.count }));

        const domainBreakdown: Record<string, number> = {};
        Array.from(domainCounts.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, limit)
          .forEach(([domain, count]) => {
            domainBreakdown[domain] = count;
          });

        const topRecorders = Array.from(recorderCounts.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, limit)
          .map(r => ({ name: r.name, email: r.email, recording_count: r.count }));

        const output: ParticipantStats = {
          top_participants: topParticipants,
          domain_breakdown: domainBreakdown,
          top_recorders: topRecorders
        };

        let textContent: string;

        if (params.response_format === ResponseFormat.JSON) {
          textContent = JSON.stringify(output, null, 2);
        } else {
          const lines: string[] = [
            "# Participant Statistics",
            "",
            `*Based on ${meetings.length} meetings*`,
            ""
          ];

          lines.push("## Top Participants");
          for (let i = 0; i < topParticipants.length; i++) {
            const p = topParticipants[i];
            lines.push(`${i + 1}. **${p.name}** (${p.email}) - ${p.meeting_count} meetings`);
          }
          lines.push("");

          lines.push("## Top Recorders");
          for (let i = 0; i < topRecorders.length; i++) {
            const r = topRecorders[i];
            lines.push(`${i + 1}. **${r.name}** (${r.email}) - ${r.recording_count} recordings`);
          }
          lines.push("");

          lines.push("## Domain Breakdown");
          for (const [domain, count] of Object.entries(domainBreakdown)) {
            lines.push(`- **${domain}**: ${count} participant appearances`);
          }

          textContent = lines.join("\n");
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

/**
 * Format minutes into human-readable duration
 */
function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return `${hours}h ${remainingMinutes}m`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h ${remainingMinutes}m`;
}

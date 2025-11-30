/**
 * Recording tools implementation (summary, transcript)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, handleApiError } from "../services/api-client.js";
import {
  GetSummaryInputSchema,
  GetTranscriptInputSchema,
  type GetSummaryInput,
  type GetTranscriptInput
} from "../schemas/meetings.js";
import { ResponseFormat, CHARACTER_LIMIT } from "../constants.js";
import type { SummaryResponse, TranscriptResponse, TranscriptEntry } from "../types.js";

/**
 * Format transcript for markdown output
 */
function formatTranscriptMarkdown(transcript: TranscriptEntry[]): string {
  const lines: string[] = ["# Meeting Transcript", ""];

  let currentSpeaker = "";

  for (const entry of transcript) {
    if (entry.speaker.display_name !== currentSpeaker) {
      currentSpeaker = entry.speaker.display_name;
      lines.push("");
      lines.push(`### ${currentSpeaker}`);
      if (entry.speaker.matched_calendar_invitee_email) {
        lines.push(`*${entry.speaker.matched_calendar_invitee_email}*`);
      }
      lines.push("");
    }

    lines.push(`**[${entry.timestamp}]** ${entry.text}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Register recording tools with the MCP server
 */
export function registerRecordingTools(server: McpServer): void {
  // Get Summary tool
  server.registerTool(
    "fathom_get_summary",
    {
      title: "Get Fathom Meeting Summary",
      description: `Get the AI-generated summary for a specific Fathom recording.

This tool retrieves the summary that Fathom automatically generates for each meeting. The summary includes key discussion points, decisions made, and important topics covered.

Args:
  - recording_id (number, required): The ID of the recording to get the summary for
  - response_format ('markdown'|'json'): Output format (default: 'markdown')

Returns:
  The meeting summary with template name and formatted content.

Examples:
  - Get summary: { recording_id: 123456789 }
  - Get as JSON: { recording_id: 123456789, response_format: 'json' }

Notes:
  - The recording_id can be found in the meeting list response
  - Summaries are always in English regardless of the meeting's original language`,
      inputSchema: GetSummaryInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: GetSummaryInput) => {
      try {
        const response = await apiGet<SummaryResponse>(
          `/recordings/${params.recording_id}/summary`
        );

        const output = {
          recording_id: params.recording_id,
          summary: response.summary
        };

        let textContent: string;

        if (params.response_format === ResponseFormat.JSON) {
          textContent = JSON.stringify(output, null, 2);
        } else {
          // Markdown format
          const lines: string[] = [
            `# Meeting Summary`,
            `**Recording ID**: ${params.recording_id}`,
            ""
          ];

          if (response.summary.template_name) {
            lines.push(`*Template: ${response.summary.template_name}*`);
            lines.push("");
          }

          if (response.summary.markdown_formatted) {
            lines.push(response.summary.markdown_formatted);
          } else {
            lines.push("*No summary available for this recording.*");
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

  // Get Transcript tool
  server.registerTool(
    "fathom_get_transcript",
    {
      title: "Get Fathom Meeting Transcript",
      description: `Get the full transcript for a specific Fathom recording.

This tool retrieves the complete timestamped transcript of a meeting, including speaker identification and timestamps for each segment.

Args:
  - recording_id (number, required): The ID of the recording to get the transcript for
  - response_format ('markdown'|'json'): Output format (default: 'markdown')

Returns:
  Array of transcript entries, each containing:
  - speaker: Speaker name and optionally matched email
  - text: What was said
  - timestamp: When it was said (HH:MM:SS format)

Examples:
  - Get transcript: { recording_id: 123456789 }
  - Get as JSON: { recording_id: 123456789, response_format: 'json' }

Notes:
  - Transcripts can be large for long meetings
  - Speaker names are matched to calendar invitees when possible
  - Timestamps are relative to the recording start time`,
      inputSchema: GetTranscriptInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: GetTranscriptInput) => {
      try {
        const response = await apiGet<TranscriptResponse>(
          `/recordings/${params.recording_id}/transcript`
        );

        const output = {
          recording_id: params.recording_id,
          entry_count: response.transcript.length,
          transcript: response.transcript
        };

        let textContent: string;

        if (params.response_format === ResponseFormat.JSON) {
          textContent = JSON.stringify(output, null, 2);
        } else {
          textContent = formatTranscriptMarkdown(response.transcript);

          // Add metadata at the top
          textContent = `**Recording ID**: ${params.recording_id}\n**Total entries**: ${response.transcript.length}\n\n` + textContent;
        }

        // Check character limit and truncate if needed
        if (textContent.length > CHARACTER_LIMIT) {
          const truncatedTranscript = response.transcript.slice(0, Math.ceil(response.transcript.length / 2));

          if (params.response_format === ResponseFormat.JSON) {
            const truncatedOutput = {
              ...output,
              transcript: truncatedTranscript,
              truncated: true,
              truncation_message: `Transcript truncated from ${response.transcript.length} to ${truncatedTranscript.length} entries due to size limits.`
            };
            textContent = JSON.stringify(truncatedOutput, null, 2);
          } else {
            textContent = `*Transcript truncated from ${response.transcript.length} to ${truncatedTranscript.length} entries due to size limits.*\n\n` +
              formatTranscriptMarkdown(truncatedTranscript);
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

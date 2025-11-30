/**
 * Zod schemas for meeting-related tools
 */

import { z } from "zod";
import { ResponseFormat, CalendarInviteesDomainType } from "../constants.js";

// List meetings input schema
export const ListMeetingsInputSchema = z.object({
  calendar_invitees_domains: z.array(z.string())
    .optional()
    .describe("Filter by company domains (e.g., ['acme.com', 'client.com'])"),

  calendar_invitees_domains_type: z.nativeEnum(CalendarInviteesDomainType)
    .optional()
    .default(CalendarInviteesDomainType.ALL)
    .describe("Filter by whether meeting includes external participants: 'all', 'only_internal', or 'one_or_more_external'"),

  created_after: z.string()
    .optional()
    .describe("Filter meetings created after this ISO 8601 timestamp (e.g., '2024-01-01T00:00:00Z')"),

  created_before: z.string()
    .optional()
    .describe("Filter meetings created before this ISO 8601 timestamp"),

  cursor: z.string()
    .optional()
    .describe("Pagination cursor from previous response"),

  include_action_items: z.boolean()
    .optional()
    .default(false)
    .describe("Include action items for each meeting"),

  include_crm_matches: z.boolean()
    .optional()
    .default(false)
    .describe("Include CRM matches (contacts, companies, deals) for each meeting"),

  include_summary: z.boolean()
    .optional()
    .default(false)
    .describe("Include AI-generated summary for each meeting"),

  include_transcript: z.boolean()
    .optional()
    .default(false)
    .describe("Include full transcript for each meeting"),

  recorded_by: z.array(z.string().email())
    .optional()
    .describe("Filter by recorder email addresses"),

  teams: z.array(z.string())
    .optional()
    .describe("Filter by team names"),

  response_format: z.nativeEnum(ResponseFormat)
    .optional()
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for structured data")
}).strict();

export type ListMeetingsInput = z.infer<typeof ListMeetingsInputSchema>;

// Get summary input schema
export const GetSummaryInputSchema = z.object({
  recording_id: z.number()
    .int()
    .positive()
    .describe("The recording ID to get the summary for"),

  response_format: z.nativeEnum(ResponseFormat)
    .optional()
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' or 'json'")
}).strict();

export type GetSummaryInput = z.infer<typeof GetSummaryInputSchema>;

// Get transcript input schema
export const GetTranscriptInputSchema = z.object({
  recording_id: z.number()
    .int()
    .positive()
    .describe("The recording ID to get the transcript for"),

  response_format: z.nativeEnum(ResponseFormat)
    .optional()
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' or 'json'")
}).strict();

export type GetTranscriptInput = z.infer<typeof GetTranscriptInputSchema>;

// Search meetings input schema
export const SearchMeetingsInputSchema = z.object({
  query: z.string()
    .min(2, "Search query must be at least 2 characters")
    .max(200, "Search query must not exceed 200 characters")
    .describe("Search string to find in meeting titles, transcripts, and summaries"),

  created_after: z.string()
    .optional()
    .describe("Filter meetings created after this ISO 8601 timestamp"),

  created_before: z.string()
    .optional()
    .describe("Filter meetings created before this ISO 8601 timestamp"),

  teams: z.array(z.string())
    .optional()
    .describe("Filter by team names"),

  limit: z.number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(10)
    .describe("Maximum number of results to return (1-50)"),

  response_format: z.nativeEnum(ResponseFormat)
    .optional()
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' or 'json'")
}).strict();

export type SearchMeetingsInput = z.infer<typeof SearchMeetingsInputSchema>;

// Meeting stats input schema
export const MeetingStatsInputSchema = z.object({
  created_after: z.string()
    .optional()
    .describe("Filter meetings created after this ISO 8601 timestamp"),

  created_before: z.string()
    .optional()
    .describe("Filter meetings created before this ISO 8601 timestamp"),

  teams: z.array(z.string())
    .optional()
    .describe("Filter by team names"),

  response_format: z.nativeEnum(ResponseFormat)
    .optional()
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' or 'json'")
}).strict();

export type MeetingStatsInput = z.infer<typeof MeetingStatsInputSchema>;

// Participant stats input schema
export const ParticipantStatsInputSchema = z.object({
  created_after: z.string()
    .optional()
    .describe("Filter meetings created after this ISO 8601 timestamp"),

  created_before: z.string()
    .optional()
    .describe("Filter meetings created before this ISO 8601 timestamp"),

  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(10)
    .describe("Maximum number of top participants/recorders to return"),

  response_format: z.nativeEnum(ResponseFormat)
    .optional()
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' or 'json'")
}).strict();

export type ParticipantStatsInput = z.infer<typeof ParticipantStatsInputSchema>;

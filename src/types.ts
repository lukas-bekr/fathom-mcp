/**
 * Fathom MCP Server Type Definitions
 */

// Speaker information in transcripts
export interface Speaker {
  display_name: string;
  matched_calendar_invitee_email?: string;
}

// Transcript entry
export interface TranscriptEntry {
  speaker: Speaker;
  text: string;
  timestamp: string; // Format: "HH:MM:SS"
}

// Meeting summary
export interface Summary {
  template_name: string | null;
  markdown_formatted: string | null;
}

// Action item assignee
export interface Assignee {
  name: string;
  email: string;
  team?: string;
}

// Action item
export interface ActionItem {
  description: string;
  user_generated: boolean;
  completed: boolean;
  recording_timestamp: string;
  recording_playback_url: string;
  assignee?: Assignee;
}

// Calendar invitee
export interface CalendarInvitee {
  name: string;
  matched_speaker_display_name?: string;
  email: string;
  email_domain: string;
  is_external: boolean;
}

// Recording owner
export interface RecordedBy {
  name: string;
  email: string;
  email_domain: string;
  team?: string;
}

// CRM contact
export interface CrmContact {
  name: string;
  email: string;
  record_url: string;
}

// CRM company
export interface CrmCompany {
  name: string;
  record_url: string;
}

// CRM deal
export interface CrmDeal {
  name: string;
  amount: number;
  record_url: string;
}

// CRM matches
export interface CrmMatches {
  contacts?: CrmContact[];
  companies?: CrmCompany[];
  deals?: CrmDeal[];
  error?: string;
}

// Meeting object
export interface Meeting {
  title: string;
  meeting_title: string | null;
  recording_id: number;
  url: string;
  share_url: string;
  created_at: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  recording_start_time: string;
  recording_end_time: string;
  calendar_invitees_domains_type: "only_internal" | "one_or_more_external";
  transcript_language: string;
  transcript?: TranscriptEntry[] | null;
  default_summary?: Summary;
  action_items?: ActionItem[] | null;
  calendar_invitees: CalendarInvitee[];
  recorded_by: RecordedBy;
  crm_matches?: CrmMatches | null;
}

// Paginated response
export interface PaginatedResponse<T> {
  limit: number | null;
  next_cursor: string | null;
  items: T[];
}

// Team object
export interface Team {
  name: string;
  created_at: string;
}

// Team member object
export interface TeamMember {
  name: string;
  email: string;
  created_at: string;
}

// Webhook object
export interface Webhook {
  id: string;
  url: string;
  secret: string;
  created_at: string;
  include_transcript: boolean;
  include_crm_matches: boolean;
  include_summary: boolean;
  include_action_items: boolean;
  triggered_for: string[];
}

// API responses
export interface MeetingsResponse extends PaginatedResponse<Meeting> {}
export interface TeamsResponse extends PaginatedResponse<Team> {}
export interface TeamMembersResponse extends PaginatedResponse<TeamMember> {}

export interface SummaryResponse {
  summary: Summary;
}

export interface TranscriptResponse {
  transcript: TranscriptEntry[];
}

// Analytics types
export interface DurationStats {
  [key: string]: unknown;
  average_minutes: number;
  min_minutes: number;
  max_minutes: number;
  total_minutes: number;
}

export interface MeetingStats {
  [key: string]: unknown;
  total_meetings: number;
  duration_stats: DurationStats;
  meetings_by_team: Record<string, number>;
  internal_vs_external: {
    internal: number;
    external: number;
  };
}

export interface ParticipantInfo {
  [key: string]: unknown;
  name: string;
  email: string;
  meeting_count: number;
}

export interface RecorderInfo {
  [key: string]: unknown;
  name: string;
  email: string;
  recording_count: number;
}

export interface ParticipantStats {
  [key: string]: unknown;
  top_participants: ParticipantInfo[];
  domain_breakdown: Record<string, number>;
  top_recorders: RecorderInfo[];
}

// Search result
export interface SearchResult {
  meeting: Meeting;
  matches: {
    in_title: boolean;
    in_transcript: boolean;
    in_summary: boolean;
    context_snippets: string[];
  };
}

/**
 * Fathom MCP Server Constants
 */

// Fathom API Configuration
export const FATHOM_API_BASE_URL = "https://api.fathom.ai/external/v1";

// Response limits
export const CHARACTER_LIMIT = 25000; // Maximum response size in characters
export const DEFAULT_PAGE_LIMIT = 20; // Default items per page

// Rate limiting
export const RATE_LIMIT_REQUESTS = 60; // Maximum requests per window
export const RATE_LIMIT_WINDOW_SECONDS = 60; // Window size in seconds

// Response format options
export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json"
}

// Webhook trigger types
export enum WebhookTriggerType {
  MY_RECORDINGS = "my_recordings",
  SHARED_EXTERNAL_RECORDINGS = "shared_external_recordings",
  MY_SHARED_WITH_TEAM_RECORDINGS = "my_shared_with_team_recordings",
  SHARED_TEAM_RECORDINGS = "shared_team_recordings"
}

// Calendar invitees domain types
export enum CalendarInviteesDomainType {
  ALL = "all",
  ONLY_INTERNAL = "only_internal",
  ONE_OR_MORE_EXTERNAL = "one_or_more_external"
}

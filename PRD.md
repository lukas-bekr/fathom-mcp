# Product Requirements Document: Fathom MCP Server

## Executive Summary

Build an MCP (Model Context Protocol) server that enables LLMs to interact with Fathom.video's meeting recording and management API. This server will allow AI assistants to list meetings, retrieve transcripts and summaries, manage teams, and configure webhooks.

## Goals

1. Provide comprehensive access to Fathom API functionality through MCP tools
2. Enable natural language interaction with meeting data
3. Support analytics and search capabilities beyond basic API operations
4. Follow MCP best practices for tool design and implementation

## Fathom API Specifications

### Base Configuration
- **API Base URL**: `https://api.fathom.ai/external/v1`
- **Authentication**: API Key via `X-Api-Key` header
- **Rate Limit**: 60 requests per 60-second window
- **Rate Limit Headers**:
  - `RateLimit-Limit`: Maximum requests allowed
  - `RateLimit-Remaining`: Requests remaining
  - `RateLimit-Reset`: Time until reset

### API Endpoints

#### 1. List Meetings
- **Endpoint**: `GET /meetings`
- **Description**: List meetings with filtering and pagination
- **Query Parameters**:
  - `calendar_invitees_domains[]`: Filter by company domains (array)
  - `calendar_invitees_domains_type`: `all` | `only_internal` | `one_or_more_external`
  - `created_after`: ISO 8601 timestamp
  - `created_before`: ISO 8601 timestamp
  - `cursor`: Pagination cursor
  - `include_action_items`: boolean (default: false)
  - `include_crm_matches`: boolean (default: false)
  - `include_summary`: boolean (default: false)
  - `include_transcript`: boolean (default: false)
  - `recorded_by[]`: Filter by recorder emails (array)
  - `teams[]`: Filter by team names (array)
- **Response**: Paginated list with `limit`, `next_cursor`, `items[]`

#### 2. Get Summary
- **Endpoint**: `GET /recordings/{recording_id}/summary`
- **Description**: Get AI-generated summary for a recording
- **Path Parameters**:
  - `recording_id`: integer (required)
- **Query Parameters**:
  - `destination_url`: URL to POST summary (optional)
- **Response**: `{ summary: { template_name, markdown_formatted } }`

#### 3. Get Transcript
- **Endpoint**: `GET /recordings/{recording_id}/transcript`
- **Description**: Get timestamped transcript for a recording
- **Path Parameters**:
  - `recording_id`: integer (required)
- **Query Parameters**:
  - `destination_url`: URL to POST transcript (optional)
- **Response**: `{ transcript: [{ speaker, text, timestamp }] }`

#### 4. List Teams
- **Endpoint**: `GET /teams`
- **Description**: List all teams accessible to the user
- **Query Parameters**:
  - `cursor`: Pagination cursor
- **Response**: `{ limit, next_cursor, items: [{ name, created_at }] }`

#### 5. List Team Members
- **Endpoint**: `GET /team_members`
- **Description**: List members of teams
- **Query Parameters**:
  - `cursor`: Pagination cursor
  - `team`: Filter by team name
- **Response**: `{ limit, next_cursor, items: [{ name, email, created_at }] }`

#### 6. Create Webhook
- **Endpoint**: `POST /webhooks`
- **Description**: Create a webhook for real-time notifications
- **Request Body**:
  - `destination_url`: string (required) - URL to receive webhooks
  - `triggered_for`: array (required) - Event types:
    - `my_recordings`
    - `shared_external_recordings`
    - `my_shared_with_team_recordings`
    - `shared_team_recordings`
  - `include_action_items`: boolean (default: false)
  - `include_crm_matches`: boolean (default: false)
  - `include_summary`: boolean (default: false)
  - `include_transcript`: boolean (default: false)
- **Response**: `{ id, url, secret, created_at, ... }`

#### 7. Delete Webhook
- **Endpoint**: `DELETE /webhooks/{id}`
- **Description**: Delete an existing webhook
- **Path Parameters**:
  - `id`: string (required)
- **Response**: 204 No Content

### Data Models

#### Meeting Object
```typescript
interface Meeting {
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
  calendar_invitees_domains_type: 'only_internal' | 'one_or_more_external';
  transcript_language: string;
  transcript?: TranscriptEntry[];
  default_summary?: Summary;
  action_items?: ActionItem[];
  calendar_invitees: CalendarInvitee[];
  recorded_by: RecordedBy;
  crm_matches?: CrmMatches;
}
```

#### Transcript Entry
```typescript
interface TranscriptEntry {
  speaker: {
    display_name: string;
    matched_calendar_invitee_email?: string;
  };
  text: string;
  timestamp: string; // Format: "HH:MM:SS"
}
```

#### Summary
```typescript
interface Summary {
  template_name: string | null;
  markdown_formatted: string | null;
}
```

#### Action Item
```typescript
interface ActionItem {
  description: string;
  user_generated: boolean;
  completed: boolean;
  recording_timestamp: string;
  recording_playback_url: string;
  assignee?: {
    name: string;
    email: string;
    team?: string;
  };
}
```

## MCP Tool Specifications

### Tool 1: fathom_list_meetings
**Purpose**: List and filter meetings from Fathom

**Input Schema**:
```typescript
{
  calendar_invitees_domains?: string[];
  calendar_invitees_domains_type?: 'all' | 'only_internal' | 'one_or_more_external';
  created_after?: string;
  created_before?: string;
  cursor?: string;
  include_action_items?: boolean;
  include_crm_matches?: boolean;
  include_summary?: boolean;
  include_transcript?: boolean;
  recorded_by?: string[];
  teams?: string[];
  response_format?: 'markdown' | 'json';
}
```

**Annotations**:
- `readOnlyHint`: true
- `destructiveHint`: false
- `idempotentHint`: true
- `openWorldHint`: true

### Tool 2: fathom_get_summary
**Purpose**: Get AI-generated summary for a specific recording

**Input Schema**:
```typescript
{
  recording_id: number;
  response_format?: 'markdown' | 'json';
}
```

**Annotations**:
- `readOnlyHint`: true
- `destructiveHint`: false
- `idempotentHint`: true
- `openWorldHint`: true

### Tool 3: fathom_get_transcript
**Purpose**: Get timestamped transcript for a specific recording

**Input Schema**:
```typescript
{
  recording_id: number;
  response_format?: 'markdown' | 'json';
}
```

**Annotations**:
- `readOnlyHint`: true
- `destructiveHint`: false
- `idempotentHint`: true
- `openWorldHint`: true

### Tool 4: fathom_list_teams
**Purpose**: List all teams accessible to the user

**Input Schema**:
```typescript
{
  cursor?: string;
  response_format?: 'markdown' | 'json';
}
```

**Annotations**:
- `readOnlyHint`: true
- `destructiveHint`: false
- `idempotentHint`: true
- `openWorldHint`: true

### Tool 5: fathom_list_team_members
**Purpose**: List members of a specific team or all teams

**Input Schema**:
```typescript
{
  team?: string;
  cursor?: string;
  response_format?: 'markdown' | 'json';
}
```

**Annotations**:
- `readOnlyHint`: true
- `destructiveHint`: false
- `idempotentHint`: true
- `openWorldHint`: true

### Tool 6: fathom_create_webhook
**Purpose**: Create a webhook for real-time meeting notifications

**Input Schema**:
```typescript
{
  destination_url: string;
  triggered_for: ('my_recordings' | 'shared_external_recordings' | 'my_shared_with_team_recordings' | 'shared_team_recordings')[];
  include_action_items?: boolean;
  include_crm_matches?: boolean;
  include_summary?: boolean;
  include_transcript?: boolean;
}
```

**Annotations**:
- `readOnlyHint`: false
- `destructiveHint`: false
- `idempotentHint`: false
- `openWorldHint`: true

### Tool 7: fathom_delete_webhook
**Purpose**: Delete an existing webhook

**Input Schema**:
```typescript
{
  id: string;
}
```

**Annotations**:
- `readOnlyHint`: false
- `destructiveHint`: true
- `idempotentHint`: true
- `openWorldHint`: true

### Tool 8: fathom_search_meetings
**Purpose**: Search across meeting transcripts and summaries

**Input Schema**:
```typescript
{
  query: string;
  created_after?: string;
  created_before?: string;
  teams?: string[];
  limit?: number;
  response_format?: 'markdown' | 'json';
}
```

**Annotations**:
- `readOnlyHint`: true
- `destructiveHint`: false
- `idempotentHint`: true
- `openWorldHint`: true

**Implementation Notes**:
- Fetches meetings with transcripts and summaries
- Performs client-side text search
- Returns matches with context snippets

### Tool 9: fathom_meeting_stats
**Purpose**: Get meeting analytics and statistics

**Input Schema**:
```typescript
{
  created_after?: string;
  created_before?: string;
  teams?: string[];
  response_format?: 'markdown' | 'json';
}
```

**Output**:
```typescript
{
  total_meetings: number;
  duration_stats: {
    average_minutes: number;
    min_minutes: number;
    max_minutes: number;
    total_minutes: number;
  };
  meetings_by_team: Record<string, number>;
  internal_vs_external: {
    internal: number;
    external: number;
  };
}
```

**Annotations**:
- `readOnlyHint`: true
- `destructiveHint`: false
- `idempotentHint`: true
- `openWorldHint`: true

### Tool 10: fathom_participant_stats
**Purpose**: Get participant frequency analytics

**Input Schema**:
```typescript
{
  created_after?: string;
  created_before?: string;
  limit?: number;
  response_format?: 'markdown' | 'json';
}
```

**Output**:
```typescript
{
  top_participants: Array<{
    name: string;
    email: string;
    meeting_count: number;
  }>;
  domain_breakdown: Record<string, number>;
  top_recorders: Array<{
    name: string;
    email: string;
    recording_count: number;
  }>;
}
```

**Annotations**:
- `readOnlyHint`: true
- `destructiveHint`: false
- `idempotentHint`: true
- `openWorldHint`: true

## Error Handling

### HTTP Status Codes
- `200`: Success
- `201`: Created (webhooks)
- `204`: No Content (delete)
- `400`: Bad Request - Invalid parameters
- `401`: Unauthorized - Invalid or missing API key
- `404`: Not Found - Resource doesn't exist
- `429`: Rate Limited - Too many requests

### Error Response Format
```typescript
{
  isError: true,
  content: [{
    type: "text",
    text: "Error: <specific message>. <suggestion for resolution>"
  }]
}
```

### Error Messages
- **401**: "Error: Authentication failed. Please check your FATHOM_API_KEY environment variable."
- **404**: "Error: Recording not found. Please verify the recording_id is correct."
- **429**: "Error: Rate limit exceeded. Please wait before making more requests. (Limit: 60/minute)"
- **Network**: "Error: Unable to connect to Fathom API. Please check your network connection."

## Non-Functional Requirements

### Performance
- Response time < 5 seconds for most operations
- Support for pagination to handle large datasets
- Character limit of 25,000 per response with truncation

### Security
- API key stored in environment variable only
- No logging of sensitive data
- Input validation via Zod schemas

### Reliability
- Graceful error handling
- Clear error messages with resolution suggestions
- Proper cleanup on server shutdown

## Success Criteria

1. All 10 tools implemented and functional
2. TypeScript compiles without errors
3. Proper Zod schema validation for all inputs
4. Error handling for all API error codes
5. Markdown and JSON response format support
6. Pagination support where applicable
7. Claude Desktop integration working
8. Comprehensive README documentation

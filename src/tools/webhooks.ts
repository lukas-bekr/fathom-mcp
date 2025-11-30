/**
 * Webhook tools implementation
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiPost, apiDelete, handleApiError } from "../services/api-client.js";
import {
  CreateWebhookInputSchema,
  DeleteWebhookInputSchema,
  type CreateWebhookInput,
  type DeleteWebhookInput
} from "../schemas/webhooks.js";
import type { Webhook } from "../types.js";

/**
 * Register webhook tools with the MCP server
 */
export function registerWebhookTools(server: McpServer): void {
  // Create Webhook tool
  server.registerTool(
    "fathom_create_webhook",
    {
      title: "Create Fathom Webhook",
      description: `Create a webhook to receive real-time notifications when meetings are processed in Fathom.

This tool creates a webhook subscription that will POST meeting data to your specified URL whenever new meeting content becomes available.

Args:
  - destination_url (string, required): The URL to receive webhook notifications
  - triggered_for (string[], required): At least one trigger type:
    - 'my_recordings': Your private recordings and those shared with individuals
    - 'shared_external_recordings': Recordings shared with you by external users
    - 'my_shared_with_team_recordings': Your recordings shared with teams
    - 'shared_team_recordings': Team recordings accessible to you
  - include_action_items (boolean): Include action items in payload (default: false)
  - include_crm_matches (boolean): Include CRM matches in payload (default: false)
  - include_summary (boolean): Include meeting summary in payload (default: false)
  - include_transcript (boolean): Include transcript in payload (default: false)

Returns:
  The created webhook details including:
  - id: Webhook ID (use this for deletion)
  - url: Destination URL
  - secret: Webhook secret for signature verification
  - created_at: Creation timestamp

Examples:
  - Basic webhook: {
      destination_url: 'https://your-app.com/webhook',
      triggered_for: ['my_recordings']
    }
  - With all content: {
      destination_url: 'https://your-app.com/webhook',
      triggered_for: ['my_recordings', 'shared_team_recordings'],
      include_transcript: true,
      include_summary: true,
      include_action_items: true
    }

Notes:
  - Webhooks use HMAC-SHA256 signatures for verification
  - The secret is only shown once upon creation - save it securely
  - Webhooks must return 2xx status to acknowledge receipt`,
      inputSchema: CreateWebhookInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params: CreateWebhookInput) => {
      try {
        const requestBody: Record<string, unknown> = {
          destination_url: params.destination_url,
          triggered_for: params.triggered_for
        };

        if (params.include_action_items !== undefined) {
          requestBody.include_action_items = params.include_action_items;
        }
        if (params.include_crm_matches !== undefined) {
          requestBody.include_crm_matches = params.include_crm_matches;
        }
        if (params.include_summary !== undefined) {
          requestBody.include_summary = params.include_summary;
        }
        if (params.include_transcript !== undefined) {
          requestBody.include_transcript = params.include_transcript;
        }

        const response = await apiPost<Webhook>("/webhooks", requestBody);

        const output = {
          success: true,
          webhook: response
        };

        const lines: string[] = [
          "# Webhook Created Successfully",
          "",
          `**Webhook ID**: \`${response.id}\``,
          `**Destination URL**: ${response.url}`,
          `**Secret**: \`${response.secret}\``,
          "",
          "**Configuration**:",
          `- Include Transcript: ${response.include_transcript ? "Yes" : "No"}`,
          `- Include Summary: ${response.include_summary ? "Yes" : "No"}`,
          `- Include Action Items: ${response.include_action_items ? "Yes" : "No"}`,
          `- Include CRM Matches: ${response.include_crm_matches ? "Yes" : "No"}`,
          "",
          "**Triggers**:",
          ...response.triggered_for.map(t => `- ${t}`),
          "",
          "---",
          "",
          "**IMPORTANT**: Save the webhook secret securely. It will not be shown again.",
          "Use the secret to verify webhook signatures using HMAC-SHA256."
        ];

        return {
          content: [{ type: "text", text: lines.join("\n") }],
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

  // Delete Webhook tool
  server.registerTool(
    "fathom_delete_webhook",
    {
      title: "Delete Fathom Webhook",
      description: `Delete an existing webhook from Fathom.

This tool removes a webhook subscription, stopping all future notifications to that endpoint.

Args:
  - id (string, required): The ID of the webhook to delete

Returns:
  Confirmation of successful deletion.

Examples:
  - Delete webhook: { id: 'ikEoQ4bVoq4JYUmc' }

Notes:
  - This action cannot be undone
  - The webhook will immediately stop receiving notifications
  - Any pending notifications may still be delivered`,
      inputSchema: DeleteWebhookInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: DeleteWebhookInput) => {
      try {
        await apiDelete(`/webhooks/${params.id}`);

        const output = {
          success: true,
          deleted_webhook_id: params.id
        };

        const textContent = [
          "# Webhook Deleted",
          "",
          `Successfully deleted webhook \`${params.id}\`.`,
          "",
          "The endpoint will no longer receive notifications from Fathom."
        ].join("\n");

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

/**
 * Zod schemas for webhook-related tools
 */

import { z } from "zod";
import { WebhookTriggerType } from "../constants.js";

// Create webhook input schema
export const CreateWebhookInputSchema = z.object({
  destination_url: z.string()
    .url("Must be a valid URL")
    .describe("The URL to receive webhook notifications"),

  triggered_for: z.array(z.nativeEnum(WebhookTriggerType))
    .min(1, "At least one trigger type is required")
    .describe("Types of recordings that trigger the webhook: 'my_recordings', 'shared_external_recordings', 'my_shared_with_team_recordings', 'shared_team_recordings'"),

  include_action_items: z.boolean()
    .optional()
    .default(false)
    .describe("Include action items in webhook payload"),

  include_crm_matches: z.boolean()
    .optional()
    .default(false)
    .describe("Include CRM matches in webhook payload"),

  include_summary: z.boolean()
    .optional()
    .default(false)
    .describe("Include meeting summary in webhook payload"),

  include_transcript: z.boolean()
    .optional()
    .default(false)
    .describe("Include transcript in webhook payload")
}).strict();

export type CreateWebhookInput = z.infer<typeof CreateWebhookInputSchema>;

// Delete webhook input schema
export const DeleteWebhookInputSchema = z.object({
  id: z.string()
    .min(1, "Webhook ID is required")
    .describe("The ID of the webhook to delete")
}).strict();

export type DeleteWebhookInput = z.infer<typeof DeleteWebhookInputSchema>;

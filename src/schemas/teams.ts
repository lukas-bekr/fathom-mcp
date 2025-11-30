/**
 * Zod schemas for team-related tools
 */

import { z } from "zod";
import { ResponseFormat } from "../constants.js";

// List teams input schema
export const ListTeamsInputSchema = z.object({
  cursor: z.string()
    .optional()
    .describe("Pagination cursor from previous response"),

  response_format: z.nativeEnum(ResponseFormat)
    .optional()
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' or 'json'")
}).strict();

export type ListTeamsInput = z.infer<typeof ListTeamsInputSchema>;

// List team members input schema
export const ListTeamMembersInputSchema = z.object({
  team: z.string()
    .optional()
    .describe("Filter by team name"),

  cursor: z.string()
    .optional()
    .describe("Pagination cursor from previous response"),

  response_format: z.nativeEnum(ResponseFormat)
    .optional()
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' or 'json'")
}).strict();

export type ListTeamMembersInput = z.infer<typeof ListTeamMembersInputSchema>;

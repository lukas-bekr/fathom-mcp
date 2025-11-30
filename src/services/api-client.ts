/**
 * Fathom API Client
 *
 * Handles all HTTP communication with the Fathom API
 */

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import { FATHOM_API_BASE_URL } from "../constants.js";

// API client instance
let apiClient: AxiosInstance | null = null;

/**
 * Initialize the API client with the API key
 */
export function initializeApiClient(apiKey: string): void {
  apiClient = axios.create({
    baseURL: FATHOM_API_BASE_URL,
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-Api-Key": apiKey
    }
  });
}

/**
 * Get the initialized API client
 */
function getClient(): AxiosInstance {
  if (!apiClient) {
    throw new Error("API client not initialized. Please set FATHOM_API_KEY environment variable.");
  }
  return apiClient;
}

/**
 * Handle API errors and return user-friendly messages
 */
export function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          return `Error: Bad request. ${data?.message || "Please check your input parameters."}`;
        case 401:
          return "Error: Authentication failed. Please check your FATHOM_API_KEY environment variable is set correctly.";
        case 403:
          return "Error: Access denied. You don't have permission to access this resource.";
        case 404:
          return "Error: Resource not found. Please verify the ID is correct.";
        case 429:
          const resetTime = error.response.headers["ratelimit-reset"];
          return `Error: Rate limit exceeded (60 requests/minute). Please wait ${resetTime || "a moment"} before making more requests.`;
        case 500:
        case 502:
        case 503:
          return "Error: Fathom API is temporarily unavailable. Please try again later.";
        default:
          return `Error: API request failed with status ${status}. ${data?.message || ""}`;
      }
    } else if (error.code === "ECONNABORTED") {
      return "Error: Request timed out. Please try again.";
    } else if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      return "Error: Unable to connect to Fathom API. Please check your network connection.";
    }
  }

  return `Error: Unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`;
}

/**
 * Make a GET request to the Fathom API
 */
export async function apiGet<T>(
  endpoint: string,
  params?: Record<string, unknown>
): Promise<T> {
  const client = getClient();

  // Convert array parameters to the format Fathom expects (repeated keys with [])
  const config: AxiosRequestConfig = {};
  if (params) {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;

      if (Array.isArray(value)) {
        // For array params, add each value with [] suffix
        for (const item of value) {
          searchParams.append(`${key}[]`, String(item));
        }
      } else {
        searchParams.append(key, String(value));
      }
    }

    config.params = searchParams;
  }

  const response = await client.get<T>(endpoint, config);
  return response.data;
}

/**
 * Make a POST request to the Fathom API
 */
export async function apiPost<T>(
  endpoint: string,
  data?: Record<string, unknown>
): Promise<T> {
  const client = getClient();
  const response = await client.post<T>(endpoint, data);
  return response.data;
}

/**
 * Make a DELETE request to the Fathom API
 */
export async function apiDelete(endpoint: string): Promise<void> {
  const client = getClient();
  await client.delete(endpoint);
}

/**
 * Check if the API client is initialized
 */
export function isClientInitialized(): boolean {
  return apiClient !== null;
}

/**
 * TanStack Query defaults shared by the app and the tests.
 */
import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "../api/errors";
import { QUERY_RETRY_COUNT, QUERY_STALE_MS } from "../config/constants";

/**
 * Decide whether a failed read is worth retrying.
 *
 * Only transient failures are retried. A 404 or 422 will fail the same way again.
 *
 * @param failureCount Attempts so far.
 * @param error What the last attempt threw.
 * @returns True to retry.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  const transient =
    !(error instanceof ApiError) || error.kind === "unreachable" || error.kind === "server";
  return transient && failureCount < QUERY_RETRY_COUNT;
}

/**
 * Create a query client with the app's policies.
 *
 * @returns A new QueryClient. Mutations never retry: a write that may have been
 *   applied must not be sent twice.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: QUERY_STALE_MS },
      mutations: { retry: false },
    },
  });
}

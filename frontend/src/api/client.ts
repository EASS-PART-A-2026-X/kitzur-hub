/**
 * The only module that performs HTTP. Everything else goes through hooks/.
 */
import createClient from "openapi-fetch";
import { API_BASE_URL } from "../config/constants";
import { ApiError, fromNetworkFailure, fromResponse } from "./errors";
import type { paths } from "./schema";

/**
 * Typed client generated from the backend OpenAPI schema.
 *
 * Developer note: the base URL is absolute because Request in Node (tests)
 * rejects relative URLs. fetch is looked up on every call instead of being
 * captured once, so test mocks installed after import are still used.
 */
export const api = createClient<paths>({
  baseUrl: `${window.location.origin}${API_BASE_URL}`,
  fetch: (input) => globalThis.fetch(input),
});

/** Shape every openapi-fetch call resolves to. */
interface FetchResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

/**
 * Run one API call and return its data, or throw an ApiError.
 *
 * Developer note: fetch only rejects when no response arrived at all. For a GET
 * that just means "unreachable". For a write it means the server may have
 * applied the change before the connection dropped, so the error kind becomes
 * "unknown_outcome" and the UI tells the user to refresh instead of retrying.
 *
 * @param method HTTP method of the call, used to classify network failures.
 * @param call A function that performs the openapi-fetch request.
 * @returns The response body.
 * @throws {ApiError} For any non-2xx response or network failure.
 */
export async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  call: () => Promise<FetchResult<T>>,
): Promise<T> {
  let result: FetchResult<T>;
  try {
    result = await call();
  } catch (cause) {
    throw fromNetworkFailure(method, cause);
  }
  if (!result.response.ok) {
    throw fromResponse(result.response.status, result.error);
  }
  return result.data as T;
}

/**
 * Serialize upload fields as multipart/form-data.
 *
 * Developer note: the generated schema types file fields as `string` (OpenAPI's
 * "binary" format), so upload hooks cast their `{ file: File }` body and pass
 * this serializer. The browser then sets the multipart boundary itself.
 *
 * @param fields Field values: files or plain strings.
 * @returns The form data to send.
 */
export function toFormData(fields: unknown): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields as Record<string, Blob | string>)) {
    // Pass the file name explicitly: some FormData implementations send "blob" otherwise,
    // and the server picks the parser by file extension.
    if (value instanceof Blob && "name" in value) data.append(name, value, String(value.name));
    else data.append(name, value);
  }
  return data;
}

export { ApiError };

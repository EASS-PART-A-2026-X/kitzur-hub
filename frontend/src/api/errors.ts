/**
 * Error model shared by the API layer and the UI. No UI strings here:
 * translation happens in hooks/useErrorMessage.
 */

/** What went wrong, from the user's point of view. */
export type ApiErrorKind =
  | "validation"
  | "unprocessable"
  | "not_found"
  | "conflict"
  | "too_large"
  | "unsupported"
  | "server"
  | "unreachable"
  | "unknown_outcome";

/** One field-level validation problem, taken from a FastAPI 422 body. */
export interface FieldError {
  /** Field name (last element of Pydantic's `loc`). */
  field: string;
  /** Pydantic error type, e.g. "string_too_long". */
  type: string;
  /** Pydantic context, e.g. { max_length: 80 }. */
  ctx: Record<string, unknown>;
  /** Pydantic's English message, used as a fallback. */
  message: string;
}

/** Error thrown by api/client for every failed call. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly fieldErrors: FieldError[];
  readonly detail: unknown;

  /**
   * @param kind Classified failure.
   * @param status HTTP status, or null if no response arrived.
   * @param detail The response's `detail` field, if any.
   * @param fieldErrors Parsed 422 errors, if any.
   */
  constructor(
    kind: ApiErrorKind,
    status: number | null,
    detail: unknown = null,
    fieldErrors: FieldError[] = [],
  ) {
    super(typeof detail === "string" ? detail : kind);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.detail = detail;
    this.fieldErrors = fieldErrors;
  }
}

const KIND_BY_STATUS: Record<number, ApiErrorKind> = {
  404: "not_found",
  409: "conflict",
  413: "too_large",
  415: "unsupported",
  422: "validation",
};

/**
 * Read FastAPI's 422 body into field errors.
 *
 * @param detail The `detail` array of a 422 response.
 * @returns One entry per invalid field. Body-level errors use the field "body".
 */
export function parseFieldErrors(detail: unknown): FieldError[] {
  if (!Array.isArray(detail)) return [];
  return detail.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const { loc, type, ctx, msg } = item as Record<string, unknown>;
    const path = Array.isArray(loc) ? loc : [];
    return [
      {
        field: String(path.at(-1) ?? "body"),
        type: typeof type === "string" ? type : "unknown",
        ctx: typeof ctx === "object" && ctx !== null ? (ctx as Record<string, unknown>) : {},
        message: typeof msg === "string" ? msg : "",
      },
    ];
  });
}

/**
 * Build an ApiError from a non-2xx response.
 *
 * @param status HTTP status code.
 * @param body Parsed response body (FastAPI puts the reason in `detail`).
 * @returns The classified error.
 */
export function fromResponse(status: number, body: unknown): ApiError {
  const detail =
    typeof body === "object" && body !== null && "detail" in body
      ? (body as { detail: unknown }).detail
      : body;
  const fieldErrors = status === 422 ? parseFieldErrors(detail) : [];
  // A 422 without field errors is a business rule ("no transcript in this file"),
  // not a form mistake, so it gets its own message.
  const kind =
    status === 422 && fieldErrors.length === 0
      ? "unprocessable"
      : (KIND_BY_STATUS[status] ?? "server");
  return new ApiError(kind, status, detail, fieldErrors);
}

/**
 * Build an ApiError for a request that got no response.
 *
 * @param method HTTP method of the failed call.
 * @param cause The underlying fetch error.
 * @returns "unreachable" for reads, "unknown_outcome" for writes.
 */
export function fromNetworkFailure(method: string, cause: unknown): ApiError {
  const kind: ApiErrorKind = method === "GET" ? "unreachable" : "unknown_outcome";
  return new ApiError(kind, null, cause instanceof Error ? cause.message : null);
}

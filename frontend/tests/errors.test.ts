/**
 * Error classification in the API layer.
 */
import { describe, expect, it } from "vitest";
import { ApiError, fromNetworkFailure, fromResponse } from "../src/api/errors";
import { shouldRetry } from "../src/app/queryClient";

const FASTAPI_422 = {
  detail: [
    {
      type: "string_too_long",
      loc: ["body", "name"],
      msg: "String should have at most 80 characters",
      ctx: { max_length: 80 },
    },
    { type: "missing", loc: ["body", "code"], msg: "Field required" },
  ],
};

describe("fromResponse", () => {
  it("parses FastAPI 422 bodies into field errors", () => {
    const error = fromResponse(422, FASTAPI_422);
    expect(error.kind).toBe("validation");
    expect(error.fieldErrors.map((f) => [f.field, f.type])).toEqual([
      ["name", "string_too_long"],
      ["code", "missing"],
    ]);
    expect(error.fieldErrors[0].ctx).toEqual({ max_length: 80 });
  });

  it.each([
    [404, "not_found"],
    [409, "conflict"],
    [413, "too_large"],
    [415, "unsupported"],
    [500, "server"],
    [502, "server"],
  ])("maps %i to %s", (status, kind) => {
    expect(fromResponse(status, { detail: "x" }).kind).toBe(kind);
  });
});

describe("fromNetworkFailure", () => {
  it("treats a failed read as unreachable and a failed write as unknown outcome", () => {
    expect(fromNetworkFailure("GET", new TypeError("fetch failed")).kind).toBe("unreachable");
    expect(fromNetworkFailure("POST", new TypeError("fetch failed")).kind).toBe("unknown_outcome");
  });
});

describe("shouldRetry", () => {
  it("retries transient read failures once and never retries client errors", () => {
    expect(shouldRetry(0, new ApiError("unreachable", null))).toBe(true);
    expect(shouldRetry(1, new ApiError("unreachable", null))).toBe(false);
    expect(shouldRetry(0, new ApiError("not_found", 404))).toBe(false);
    expect(shouldRetry(0, new ApiError("validation", 422))).toBe(false);
  });
});

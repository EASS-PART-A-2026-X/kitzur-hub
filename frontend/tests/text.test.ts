/**
 * Direction of user text.
 */
import { describe, expect, it } from "vitest";
import { dirOf } from "../src/lib/text";

describe("dirOf", () => {
  it.each([
    ["EASS שיעור 2: HTTP, FastAPI ו-Pydantic", "rtl"],
    ["שיעור 1", "rtl"],
    ["Engineering of Advanced Software Solutions", "ltr"],
    ["2027A", "ltr"],
    ["12345", "rtl"],
    ["", "rtl"],
  ])("%s is %s", (text, dir) => {
    expect(dirOf(text)).toBe(dir);
  });
});

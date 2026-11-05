/**
 * Date helpers: Israel calendar days and wall-clock formatting.
 */
import { describe, expect, it } from "vitest";
import {
  daysUntil,
  formatLocal,
  fromInput,
  toDateTimeInput,
  todayInIsrael,
} from "../src/lib/dates";

// 22:30 UTC on 8 Nov is already 9 Nov in Israel (UTC+2).
const LATE_EVENING_UTC = new Date("2026-11-08T22:30:00Z");

describe("dates", () => {
  it("uses the Israeli calendar day, not the device's", () => {
    expect(todayInIsrael(LATE_EVENING_UTC)).toBe("2026-11-09");
    expect(daysUntil("2026-11-09T23:59:00", LATE_EVENING_UTC)).toBe(0);
    expect(daysUntil("2026-11-10", LATE_EVENING_UTC)).toBe(1);
    expect(daysUntil("2026-11-01T10:00:00", LATE_EVENING_UTC)).toBe(-8);
  });

  it("formats wall-clock times exactly as stored", () => {
    expect(formatLocal("2026-11-09T23:59:00", "en-GB")).toBe("9 Nov 2026, 23:59");
    expect(formatLocal("2027-02-01", "en-GB")).toBe("1 Feb 2027");
  });

  it("converts between API values and input values", () => {
    expect(toDateTimeInput("2026-11-09T23:59:00")).toBe("2026-11-09T23:59");
    expect(toDateTimeInput(null)).toBe("");
    expect(fromInput("  ")).toBeNull();
    expect(fromInput("2026-11-09T23:59")).toBe("2026-11-09T23:59");
  });
});

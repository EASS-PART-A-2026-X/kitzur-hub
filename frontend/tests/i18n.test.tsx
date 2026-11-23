/**
 * Translations, direction and error messages.
 */
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { fromNetworkFailure, fromResponse } from "../src/api/errors";
import { Providers } from "../src/app/Providers";
import { createQueryClient } from "../src/app/queryClient";
import { useErrorMessage } from "../src/hooks/useErrorMessage";
import i18n from "../src/i18n";

/** Wrap hooks in the app providers. */
const wrapper = ({ children }: { children: ReactNode }) => (
  <Providers queryClient={createQueryClient()} env="test">
    {children}
  </Providers>
);

describe("i18n", () => {
  it("starts in Hebrew, right to left, and mirrors it on <html>", () => {
    expect(i18n.language).toBe("he");
    expect(i18n.dir()).toBe("rtl");
    void i18n.changeLanguage("he");
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("he");
  });
});

describe("useErrorMessage", () => {
  it("translates field errors with their limits, and unknown types with a fallback", () => {
    const { result } = renderHook(() => useErrorMessage(), { wrapper });
    const error = fromResponse(422, {
      detail: [
        { type: "string_too_long", loc: ["body", "name"], ctx: { max_length: 80 } },
        { type: "some_new_pydantic_type", loc: ["body", "code"] },
      ],
    });
    const messages = result.current(error);
    expect(messages.fields.name).toBe("ארוך מדי (עד 80 תווים).");
    expect(messages.fields.code).toBe("ערך לא תקין.");
  });

  it("tells the user a lost write may have been saved", () => {
    const { result } = renderHook(() => useErrorMessage(), { wrapper });
    expect(result.current(fromNetworkFailure("PATCH", null)).summary).toContain(
      "ייתכן שהשינוי נשמר",
    );
  });
});

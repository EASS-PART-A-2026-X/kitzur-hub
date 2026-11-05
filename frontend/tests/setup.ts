/**
 * Global test setup: DOM matchers, browser APIs Mantine needs, and the mock API.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./msw/server";

// jsdom lacks matchMedia and ResizeObserver, which Mantine reads on mount.
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;

// jsdom has no layout, so Mantine's combobox cannot scroll options into view.
Element.prototype.scrollIntoView ??= () => {};

globalThis.ResizeObserver ??= class {
  /** No-op: layout is not measured in jsdom. */
  observe() {}
  /** No-op. */
  unobserve() {}
  /** No-op. */
  disconnect() {}
};

// Unhandled requests fail the test, so every call a test makes is deliberate.
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

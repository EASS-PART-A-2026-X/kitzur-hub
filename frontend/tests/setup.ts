/**
 * Global test setup: DOM matchers, browser APIs Mantine needs, and the mock API.
 */
import "@testing-library/jest-dom/vitest";
import { File as NodeFile } from "node:buffer";
import { createRequire } from "node:module";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./msw/server";

/**
 * Make Request send jsdom FormData uploads with their real bytes and file names.
 *
 * Developer note: Vitest copies jsdom FormData into Node's FormData as nameless blobs,
 * and Node's FormData wraps those with the global File, which is jsdom's, so the
 * request carries empty files named "blob". Here each file part becomes a Node File
 * up front. jsdom only exposes Blob bytes synchronously through its internal bindings,
 * the same ones Vitest reads.
 */
async function sendRealUploads() {
  const { implForWrapper } = createRequire(import.meta.url)("jsdom/lib/generated/idl/utils.js");
  const JsdomFormData = FormData;
  const JsdomFile = File;
  const BaseRequest = Request;
  // Node's FormData is not a global under jsdom; a parsed body is an instance of it.
  const parsed = await new Response(new URLSearchParams()).formData();
  const NodeFormData = parsed.constructor as typeof FormData;
  globalThis.Request = class extends BaseRequest {
    /** Convert a jsdom FormData body before Vitest's own conversion sees it. */
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      if (init?.body instanceof JsdomFormData) {
        const form = new NodeFormData();
        init.body.forEach((value, name) => {
          if (value instanceof JsdomFile) {
            const bytes: Uint8Array<ArrayBuffer> = implForWrapper(value)._bytes;
            form.append(name, new NodeFile([bytes], value.name, { type: value.type }) as File);
          } else form.append(name, value);
        });
        super(input, { ...init, body: form });
      } else super(input, init);
    }

    /** Parse with Node's File as the global, which Node's multipart parser requires. */
    async formData() {
      globalThis.File = NodeFile as typeof File;
      try {
        return await super.formData();
      } finally {
        globalThis.File = JsdomFile;
      }
    }
  };
}
await sendRealUploads();

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

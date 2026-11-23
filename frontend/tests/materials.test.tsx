/**
 * Materials tab: upload with a kind, list, text preview, kind change.
 */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import type { Material } from "../src/api/types";
import { COURSE, MATERIAL } from "./fixtures";
import { apiUrl, server } from "./msw/server";
import { renderRoute } from "./render";

/**
 * Serve the course and a mutable material list.
 *
 * @param materials Materials to list; tests mutate it to simulate uploads.
 */
function serveMaterials(materials: Material[]) {
  server.use(
    http.get(apiUrl("/courses/1"), () => HttpResponse.json(COURSE)),
    http.get(apiUrl("/courses/1/materials"), () => HttpResponse.json(materials)),
  );
}

/** The hidden file input inside the drop zone. */
const fileInput = () =>
  document.querySelector<HTMLInputElement>('input[type="file"]') as HTMLInputElement;

describe("Materials tab", () => {
  it("lists materials with their size", async () => {
    serveMaterials([MATERIAL]);
    renderRoute("/courses/1/materials");
    expect(await screen.findByText("syllabus.pdf")).toBeInTheDocument();
    expect(screen.getByText(/6 עמודים/)).toBeInTheDocument();
  });

  it("explains what materials are for when there are none", async () => {
    serveMaterials([]);
    renderRoute("/courses/1/materials");
    expect(await screen.findByText(/העלו סילבוס ומבחנים קודמים/)).toBeInTheDocument();
  });

  it("uploads with the chosen kind", async () => {
    const materials: Material[] = [];
    let kind: FormDataEntryValue | null = null;
    serveMaterials(materials);
    server.use(
      http.post(apiUrl("/courses/1/materials"), async ({ request }) => {
        kind = (await request.formData()).get("kind");
        const created = { ...MATERIAL, kind: "past_exam" as const, filename: "exam.pdf" };
        materials.push(created);
        return HttpResponse.json(created, { status: 201 });
      }),
    );
    renderRoute("/courses/1/materials");
    await screen.findByText(/העלו סילבוס/);
    await userEvent.click(screen.getByText("מבחן קודם"));
    expect(screen.getByText("גררו לכאן מבחנים קודמים")).toBeInTheDocument();
    await userEvent.upload(fileInput(), new File(["%PDF"], "exam.pdf"));
    expect(await screen.findByText("חולצו 10492 תווים מ-6 עמודים")).toBeInTheDocument();
    expect(kind).toBe("past_exam");
    // Once in the upload results and once in the refreshed list.
    expect(await screen.findAllByText("exam.pdf")).toHaveLength(2);
  });

  it("shows the server's reason for an unreadable PDF", async () => {
    serveMaterials([]);
    server.use(
      http.post(apiUrl("/courses/1/materials"), () =>
        HttpResponse.json({ detail: "the PDF has no text layer" }, { status: 422 }),
      ),
    );
    renderRoute("/courses/1/materials");
    await screen.findByText(/העלו סילבוס/);
    await userEvent.upload(fileInput(), new File(["%PDF"], "scan.pdf"));
    expect(await screen.findByText(/לא הצלחנו לעבד את התוכן/)).toBeInTheDocument();
  });

  it("previews the extracted text", async () => {
    serveMaterials([MATERIAL]);
    server.use(
      http.get(apiUrl("/materials/3"), () =>
        HttpResponse.json({ ...MATERIAL, text: "שבוע 1: מבוא\nשבוע 2: רגרסיה" }),
      ),
    );
    renderRoute("/courses/1/materials");
    await userEvent.click(await screen.findByRole("button", { name: /הצגת הטקסט שחולץ/ }));
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText(/שבוע 2: רגרסיה/)).toBeInTheDocument();
  });

  it("changes a material's kind inline", async () => {
    let patched: unknown = null;
    serveMaterials([MATERIAL]);
    server.use(
      http.patch(apiUrl("/materials/3"), async ({ request }) => {
        patched = await request.json();
        return HttpResponse.json({ ...MATERIAL, kind: "past_exam" });
      }),
    );
    renderRoute("/courses/1/materials");
    await userEvent.click(await screen.findByRole("combobox", { name: "סוג: syllabus.pdf" }));
    await userEvent.click(await screen.findByRole("option", { name: "מבחן קודם" }));
    await waitFor(() => expect(patched).toEqual({ kind: "past_exam" }));
  });
});

/**
 * Lectures tab (upload and list) and the transcript viewer.
 */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import type { Lecture } from "../src/api/types";
import { COURSE, LECTURE, LECTURE_DETAIL } from "./fixtures";
import { apiUrl, server } from "./msw/server";
import { renderRoute } from "./render";

/**
 * Serve the course and a mutable lecture list.
 *
 * @param lectures Lectures to list; tests mutate it to simulate uploads.
 */
function serveLectures(lectures: Lecture[]) {
  server.use(
    http.get(apiUrl("/courses/1"), () => HttpResponse.json(COURSE)),
    http.get(apiUrl("/courses/1/lectures"), () => HttpResponse.json(lectures)),
  );
}

/** The hidden file input inside the drop zone. */
const fileInput = () =>
  document.querySelector<HTMLInputElement>('input[type="file"]') as HTMLInputElement;

/**
 * A small upload file.
 *
 * Note: jsdom's File loses its name when Node's fetch serializes it, so the
 * mocked server tells files apart by content, not by name.
 */
const upload = (content = "**[00:00:01] מרצה:** שלום", name = "lecture.transcript.md") =>
  new File([content], name, { type: "text/plain" });

describe("Lectures tab", () => {
  it("is the default course tab and lists lectures", async () => {
    serveLectures([LECTURE]);
    renderRoute("/courses/1");
    expect(await screen.findByRole("link", { name: LECTURE.title })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "הרצאות" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("1:02:05")).toBeInTheDocument();
  });

  it("shows how to start when there are no lectures", async () => {
    serveLectures([]);
    renderRoute("/courses/1/lectures");
    expect(await screen.findByText(/גררו קובץ תמלול/)).toBeInTheDocument();
  });

  it("uploads a file as multipart and lists the new lecture", async () => {
    const lectures: Lecture[] = [];
    let sent = "";
    serveLectures(lectures);
    server.use(
      http.post(apiUrl("/courses/1/lectures/import"), async ({ request }) => {
        sent = await ((await request.formData()).get("file") as Blob).text();
        lectures.push(LECTURE);
        return HttpResponse.json(LECTURE, { status: 201 });
      }),
    );
    renderRoute("/courses/1/lectures");
    await screen.findByText(/גררו קובץ תמלול/);
    await userEvent.upload(fileInput(), upload());
    expect(await screen.findByText(/יובא/)).toHaveTextContent("3 קטעים");
    expect(await screen.findByRole("link", { name: LECTURE.title })).toBeInTheDocument();
    expect(sent).toBe("**[00:00:01] מרצה:** שלום");
  });

  it("links to the existing lecture on a duplicate and explains other failures", async () => {
    serveLectures([]);
    server.use(
      http.post(apiUrl("/courses/1/lectures/import"), async ({ request }) => {
        const content = await ((await request.formData()).get("file") as Blob).text();
        return content === "%PDF"
          ? HttpResponse.json({ detail: "supported formats" }, { status: 415 })
          : HttpResponse.json({ detail: { message: "dup", lecture_id: 5 } }, { status: 409 });
      }),
    );
    renderRoute("/courses/1/lectures");
    await screen.findByText(/גררו קובץ תמלול/);
    await userEvent.upload(fileInput(), [upload(), upload("%PDF", "slides.pdf")]);
    expect(await screen.findByText("הפריט כבר קיים.")).toBeInTheDocument();
    expect(await screen.findByText("סוג הקובץ אינו נתמך.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "פתיחה" })).toHaveAttribute("href", "/lectures/5");
  });

  it("explains a file that is not a transcript", async () => {
    serveLectures([]);
    server.use(
      http.post(apiUrl("/courses/1/lectures/import"), () =>
        HttpResponse.json({ detail: "no blocks found" }, { status: 422 }),
      ),
    );
    renderRoute("/courses/1/lectures");
    await screen.findByText(/גררו קובץ תמלול/);
    await userEvent.upload(fileInput(), upload("# just a heading"));
    expect(await screen.findByText(/לא הצלחנו לעבד את התוכן/)).toBeInTheDocument();
  });
});

describe("Lecture page", () => {
  /** Serve the lecture detail. */
  const serveDetail = () =>
    server.use(http.get(apiUrl("/lectures/5"), () => HttpResponse.json(LECTURE_DETAIL)));

  it("shows the transcript with speaker roles", async () => {
    serveDetail();
    renderRoute("/lectures/5");
    expect(await screen.findByText("היום נדבר על HTTP ועל קודי סטטוס.")).toBeInTheDocument();
    expect(screen.getAllByText("מרצה")).toHaveLength(2);
    expect(screen.getByText("סטודנט/ית")).toBeInTheDocument();
  });

  it("filters the transcript by search and counts the matches", async () => {
    serveDetail();
    renderRoute("/lectures/5");
    const search = await screen.findByRole("textbox", { name: "חיפוש בתמלול" });
    await userEvent.type(search, "patch");
    expect(await screen.findByText("נמצאו שני קטעים")).toBeInTheDocument();
    expect(screen.queryByText("היום נדבר על HTTP ועל קודי סטטוס.")).not.toBeInTheDocument();
    await userEvent.clear(search);
    await userEvent.type(search, "xyz");
    expect(await screen.findByText("לא נמצאו קטעים תואמים")).toBeInTheDocument();
  });

  it("renames the lecture", async () => {
    let patched: unknown = null;
    serveDetail();
    server.use(
      http.patch(apiUrl("/lectures/5"), async ({ request }) => {
        patched = await request.json();
        return HttpResponse.json({ ...LECTURE, title: "חדש" });
      }),
    );
    renderRoute("/lectures/5");
    await userEvent.click(await screen.findByRole("button", { name: "עריכה" }));
    const title = screen.getByLabelText(/כותרת/);
    await userEvent.clear(title);
    await userEvent.type(title, "חדש");
    await userEvent.click(screen.getByRole("button", { name: "שמירה" }));
    await waitFor(() => expect(patched).toEqual({ title: "חדש", held_on: "2026-10-26" }));
  });

  it("deletes after confirmation and returns to the course", async () => {
    serveDetail();
    serveLectures([]);
    server.use(http.delete(apiUrl("/lectures/5"), () => new HttpResponse(null, { status: 204 })));
    renderRoute("/lectures/5");
    await userEvent.click(await screen.findByRole("button", { name: "מחיקה" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "מחיקה" }));
    expect(await screen.findByText(/גררו קובץ תמלול/)).toBeInTheDocument();
  });

  it("treats a malformed id as not found", async () => {
    renderRoute("/lectures/abc");
    expect(await screen.findByText("העמוד לא נמצא")).toBeInTheDocument();
  });
});

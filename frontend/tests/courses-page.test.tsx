/**
 * The courses page in each of its states, plus creating a course.
 */
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { COURSE } from "./fixtures";
import { apiUrl, server } from "./msw/server";
import { renderRoute } from "./render";

describe("CoursesPage", () => {
  it("shows a card per course with its counts", async () => {
    server.use(http.get(apiUrl("/courses"), () => HttpResponse.json([COURSE])));
    renderRoute("/");
    const card = await screen.findByRole("link", { name: COURSE.name });
    expect(within(card).getByText(/שתי הרצאות/)).toBeInTheDocument();
    expect(within(card).getByText(/משימה פתוחה אחת/)).toBeInTheDocument();
  });

  it("explains what to do when there are no courses", async () => {
    server.use(http.get(apiUrl("/courses"), () => HttpResponse.json([])));
    renderRoute("/");
    expect(await screen.findByText(/צרו קורס ראשון/)).toBeInTheDocument();
  });

  it("shows a server-down message and recovers after retry", async () => {
    let up = false;
    server.use(
      http.get(apiUrl("/courses"), () => (up ? HttpResponse.json([COURSE]) : HttpResponse.error())),
    );
    renderRoute("/");
    expect(await screen.findByRole("alert", {}, { timeout: 4000 })).toHaveTextContent(
      "השרת לא זמין",
    );
    up = true;
    await userEvent.click(screen.getByRole("button", { name: "נסו שוב" }));
    expect(await screen.findByRole("link", { name: COURSE.name })).toBeInTheDocument();
  });

  it("creates a course and opens it", async () => {
    let created: unknown = null;
    server.use(
      http.get(apiUrl("/courses"), () => HttpResponse.json([])),
      http.post(apiUrl("/courses"), async ({ request }) => {
        created = await request.json();
        return HttpResponse.json({ ...COURSE, id: 7 }, { status: 201 });
      }),
      http.get(apiUrl("/courses/7"), () => HttpResponse.json({ ...COURSE, id: 7 })),
      http.get(apiUrl("/courses/7/tasks"), () => HttpResponse.json([])),
    );
    renderRoute("/");
    await userEvent.click(await screen.findByRole("button", { name: "קורס חדש" }));
    await userEvent.type(screen.getByLabelText(/שם הקורס/), "EASS");
    await userEvent.type(screen.getByLabelText(/קוד קורס/), "EASS");
    await userEvent.type(screen.getByLabelText(/סמסטר/), "2027A");
    await userEvent.click(screen.getByRole("button", { name: "יצירה" }));
    expect(await screen.findByRole("tab", { name: "משימות" })).toBeInTheDocument();
    expect(created).toEqual({ name: "EASS", code: "EASS", semester: "2027A", exam_date: null });
  });

  it("puts server validation errors under the matching field", async () => {
    server.use(
      http.get(apiUrl("/courses"), () => HttpResponse.json([])),
      http.post(apiUrl("/courses"), () =>
        HttpResponse.json(
          { detail: [{ type: "string_too_long", loc: ["body", "code"], ctx: { max_length: 20 } }] },
          { status: 422 },
        ),
      ),
    );
    renderRoute("/");
    await userEvent.click(await screen.findByRole("button", { name: "קורס חדש" }));
    await userEvent.type(screen.getByLabelText(/שם הקורס/), "x");
    await userEvent.type(screen.getByLabelText(/קוד קורס/), "x");
    await userEvent.type(screen.getByLabelText(/סמסטר/), "x");
    await userEvent.click(screen.getByRole("button", { name: "יצירה" }));
    expect(await screen.findByText("ארוך מדי (עד 20 תווים).")).toBeInTheDocument();
  });

  it("blocks an empty form before calling the server", async () => {
    server.use(http.get(apiUrl("/courses"), () => HttpResponse.json([])));
    renderRoute("/");
    await userEvent.click(await screen.findByRole("button", { name: "קורס חדש" }));
    await userEvent.click(screen.getByRole("button", { name: "יצירה" }));
    expect(screen.getAllByText("שדה חובה.")).toHaveLength(3);
  });

  it("renders the not-found page for unknown URLs", async () => {
    renderRoute("/no/such/page");
    expect(await screen.findByText("העמוד לא נמצא")).toBeInTheDocument();
  });
});

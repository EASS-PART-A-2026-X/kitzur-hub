/**
 * The courses page in each of its states, against a mocked backend.
 */
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { apiUrl, server } from "./msw/server";
import { renderRoute } from "./render";

const COURSE = { id: 1, name: "EASS", code: "EASS", semester: "2027A", exam_date: null };

describe("CoursesPage", () => {
  it("lists courses", async () => {
    server.use(http.get(apiUrl("/courses"), () => HttpResponse.json([COURSE])));
    renderRoute("/");
    expect(await screen.findByText("EASS")).toBeInTheDocument();
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
    expect(await screen.findByText("EASS")).toBeInTheDocument();
  });

  it("renders the not-found page for unknown URLs", async () => {
    renderRoute("/no/such/page");
    expect(await screen.findByText("העמוד לא נמצא")).toBeInTheDocument();
  });
});

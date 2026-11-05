/**
 * The course page frame and its Tasks tab, against a mocked backend.
 */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import type { Task } from "../src/api/types";
import { COURSE, TASK } from "./fixtures";
import { apiUrl, server } from "./msw/server";
import { renderRoute } from "./render";

/**
 * Serve the course and a mutable task list.
 *
 * @param tasks Initial tasks; tests mutate the array to simulate server changes.
 */
function serveCourse(tasks: Task[]) {
  server.use(
    http.get(apiUrl("/courses/1"), () => HttpResponse.json(COURSE)),
    http.get(apiUrl("/courses/1/tasks"), () => HttpResponse.json(tasks)),
  );
}

describe("Course page and Tasks tab", () => {
  it("lists tasks with their weight", async () => {
    serveCourse([TASK]);
    renderRoute("/courses/1/tasks");
    expect(await screen.findByText(TASK.title)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "משימות" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("20% מהציון")).toBeInTheDocument();
  });

  it("shows an empty state with a next step", async () => {
    serveCourse([]);
    renderRoute("/courses/1/tasks");
    expect(await screen.findByText(/הוסיפו את ההגשה הקרובה/)).toBeInTheDocument();
  });

  it("shows not-found for a missing course and for a malformed id", async () => {
    server.use(
      http.get(apiUrl("/courses/9"), () =>
        HttpResponse.json({ detail: "Course 9 not found" }, { status: 404 }),
      ),
    );
    renderRoute("/courses/9");
    expect(await screen.findByRole("alert")).toHaveTextContent("הפריט לא נמצא");
    renderRoute("/courses/abc");
    expect(await screen.findByText("העמוד לא נמצא")).toBeInTheDocument();
  });

  it("changes a task's status inline", async () => {
    let patched: unknown = null;
    serveCourse([TASK]);
    server.use(
      http.patch(apiUrl(`/tasks/${TASK.id}`), async ({ request }) => {
        patched = await request.json();
        return HttpResponse.json({ ...TASK, status: "done" });
      }),
    );
    renderRoute("/courses/1/tasks");
    await userEvent.click(await screen.findByRole("combobox", { name: `סטטוס: ${TASK.title}` }));
    await userEvent.click(await screen.findByRole("option", { name: "הושלם" }));
    await waitFor(() => expect(patched).toEqual({ status: "done" }));
  });

  it("creates a task with a deadline", async () => {
    const tasks: Task[] = [];
    let posted: Record<string, unknown> = {};
    serveCourse(tasks);
    server.use(
      http.post(apiUrl("/courses/1/tasks"), async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>;
        tasks.push({ ...TASK, ...posted, id: 11 } as Task);
        return HttpResponse.json(tasks[0], { status: 201 });
      }),
    );
    renderRoute("/courses/1/tasks");
    await userEvent.click(await screen.findByRole("button", { name: "משימה חדשה" }));
    await userEvent.type(screen.getByLabelText(/כותרת/), "EX2");
    await userEvent.type(screen.getByLabelText(/מועד הגשה/), "2099-11-30T23:59");
    await userEvent.click(screen.getByRole("button", { name: "יצירה" }));
    expect(await screen.findByText("EX2")).toBeInTheDocument();
    expect(posted).toMatchObject({ title: "EX2", due_at: "2099-11-30T23:59", weight_pct: null });
  });

  it("asks before deleting and removes the task", async () => {
    const tasks = [TASK];
    serveCourse(tasks);
    server.use(
      http.delete(apiUrl(`/tasks/${TASK.id}`), () => {
        tasks.pop();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderRoute("/courses/1/tasks");
    await userEvent.click(await screen.findByRole("button", { name: `מחיקה: ${TASK.title}` }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "מחיקה" }));
    expect(await screen.findByText(/הוסיפו את ההגשה הקרובה/)).toBeInTheDocument();
  });

  it("tells the user a lost reply may still have saved the task", async () => {
    serveCourse([]);
    server.use(http.post(apiUrl("/courses/1/tasks"), () => HttpResponse.error()));
    renderRoute("/courses/1/tasks");
    await userEvent.click(await screen.findByRole("button", { name: "משימה חדשה" }));
    await userEvent.type(screen.getByLabelText(/כותרת/), "EX2");
    await userEvent.click(screen.getByRole("button", { name: "יצירה" }));
    expect(await screen.findByText(/ייתכן שהשינוי נשמר/)).toBeInTheDocument();
  });
});

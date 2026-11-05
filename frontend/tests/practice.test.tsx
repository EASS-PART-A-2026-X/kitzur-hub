/**
 * Practice tab: setup, a graded multiple choice question, a flashcard, the score.
 */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { COURSE, FLASHCARD, LECTURE, MCQ } from "./fixtures";
import { apiUrl, server } from "./msw/server";
import { renderRoute } from "./render";

const SUMMARY = {
  questions: 2,
  attempted_questions: 0,
  attempts: 0,
  correct_attempts: 0,
  accuracy: null,
};

/**
 * Serve the course, its lectures, the practice totals and a session.
 *
 * @param questions Questions the session endpoint returns.
 * @returns A record of the last practice request's query string.
 */
function servePractice(questions: unknown[]) {
  const seen = { query: "" };
  server.use(
    http.get(apiUrl("/courses/1"), () => HttpResponse.json(COURSE)),
    http.get(apiUrl("/courses/1/lectures"), () => HttpResponse.json([LECTURE])),
    http.get(apiUrl("/courses/1/practice/summary"), () => HttpResponse.json(SUMMARY)),
    http.get(apiUrl("/courses/1/practice"), ({ request }) => {
      seen.query = new URL(request.url).search;
      return HttpResponse.json(questions);
    }),
  );
  return seen;
}

describe("Practice tab", () => {
  it("runs a session: graded multiple choice, then a self-graded flashcard, then the score", async () => {
    const seen = servePractice([MCQ, FLASHCARD]);
    const sent: unknown[] = [];
    server.use(
      http.post(apiUrl("/questions/21/attempts"), async ({ request }) => {
        sent.push(await request.json());
        return HttpResponse.json(
          {
            id: 1,
            question_id: 21,
            correct: false,
            correct_index: 2,
            explanation: "204 בלי גוף.",
            answer: null,
          },
          { status: 201 },
        );
      }),
      http.post(apiUrl("/questions/22/attempts"), async ({ request }) => {
        sent.push(await request.json());
        return HttpResponse.json(
          {
            id: 2,
            question_id: 22,
            correct: true,
            correct_index: null,
            explanation: null,
            answer: FLASHCARD.answer,
          },
          { status: 201 },
        );
      }),
    );
    renderRoute("/courses/1/practice");
    expect(await screen.findByText("שאלות בקורס")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "התחלת תרגול" }));

    expect(await screen.findByText(MCQ.prompt)).toBeInTheDocument();
    expect(seen.query).toBe("?count=10");
    await userEvent.click(screen.getByRole("button", { name: "200" }));
    expect(await screen.findByText("204 בלי גוף.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "204" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "לשאלה הבאה" }));
    expect(await screen.findByText(FLASHCARD.prompt)).toBeInTheDocument();
    expect(screen.queryByText(FLASHCARD.answer as string)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "הצגת התשובה" }));
    await userEvent.click(screen.getByRole("button", { name: "ידעתי" }));
    await userEvent.click(await screen.findByRole("button", { name: "לסיכום" }));

    expect(await screen.findByText("עניתם נכון על 1 מתוך 2.")).toBeInTheDocument();
    expect(sent).toEqual([{ chosen_index: 0 }, { knew: true }]);
  });

  it("sends the chosen lecture, type and size", async () => {
    const seen = servePractice([MCQ]);
    renderRoute("/courses/1/practice");
    await userEvent.click(await screen.findByRole("combobox", { name: "הרצאה" }));
    await userEvent.click(await screen.findByRole("option", { name: LECTURE.title }));
    await userEvent.click(screen.getByText("כרטיסיות"));
    await userEvent.click(screen.getByText("5"));
    await userEvent.click(screen.getByRole("button", { name: "התחלת תרגול" }));
    await waitFor(() => expect(seen.query).toBe("?count=5&lecture_id=5&type=flashcard"));
  });

  it("says when no questions match", async () => {
    servePractice([]);
    renderRoute("/courses/1/practice");
    await userEvent.click(await screen.findByRole("button", { name: "התחלת תרגול" }));
    expect(await screen.findByText(/אין עדיין שאלות/)).toBeInTheDocument();
  });
});

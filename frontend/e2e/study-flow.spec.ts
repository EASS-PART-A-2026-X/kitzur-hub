/**
 * The product's operational principle, end to end in a real browser:
 * create a course, drop a lecture transcript, find it again after a reload,
 * open it and search it; then manage a deadline; then practise.
 */
import path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const SAMPLE = path.resolve(import.meta.dirname, "../../samples/lecture-03.transcript.md");

/**
 * Create a course through the UI and wait for its page to open.
 *
 * @param page Playwright page.
 * @param name Unique course name for this test.
 */
async function createCourse(page: Page, name: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "קורס חדש" }).click();
  await page.getByLabel(/שם הקורס/).fill(name);
  await page.getByLabel(/קוד קורס/).fill("E2E");
  await page.getByLabel(/סמסטר/).fill("2027A");
  await page.getByRole("button", { name: "יצירה" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

test("a dropped transcript is saved, survives a reload, and can be searched", async ({ page }) => {
  await createCourse(page, `קורס בדיקה ${Date.now()}`);
  await expect(page.getByText(/גררו קובץ תמלול/)).toBeVisible();

  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "בחירת קבצים" }).click();
  await (await chooser).setFiles(SAMPLE);
  await expect(page.getByText(/יובא/)).toBeVisible();

  await page.reload();
  const lecture = page.getByRole("link", { name: /שיעור 3: התמדה/ });
  await expect(lecture).toBeVisible();

  await lecture.click();
  await page.getByRole("textbox", { name: "חיפוש בתמלול" }).fill("הדגל");
  await expect(page.getByText("נמצא קטע אחד")).toBeVisible();
  await expect(page.locator("mark")).toHaveText(["הדגל"]);
});

test("a task can be added, completed and deleted", async ({ page }) => {
  await createCourse(page, `קורס משימות ${Date.now()}`);
  await page.getByRole("tab", { name: "משימות" }).click();
  await page.getByRole("button", { name: "משימה חדשה" }).click();
  await page.getByLabel(/כותרת/).fill("הגשת תרגיל 2");
  await page.getByLabel(/מועד הגשה/).fill("2099-11-30T23:59");
  await page.getByRole("button", { name: "יצירה" }).click();
  await expect(page.getByText("הגשת תרגיל 2")).toBeVisible();

  await page.getByRole("combobox", { name: "סטטוס: הגשת תרגיל 2" }).click();
  await page.getByRole("option", { name: "הושלם" }).click();
  await expect(page.getByRole("combobox", { name: "סטטוס: הגשת תרגיל 2" })).toHaveValue("הושלם");

  await page.getByRole("button", { name: "מחיקה: הגשת תרגיל 2" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "מחיקה" }).click();
  await expect(page.getByText("הגשת תרגיל 2")).toHaveCount(0);
});

test("the seeded course can be practised and an answer is graded", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Engineering of Advanced Software Solutions" }).click();
  await page.getByRole("tab", { name: "תרגול" }).click();
  await page.getByText("אמריקאיות").click();
  await page.getByRole("button", { name: "התחלת תרגול" }).click();
  await expect(page.getByText(/שאלה 1 מתוך/)).toBeVisible();

  await page.locator(".mantine-Paper-root .mantine-Button-root").first().click();
  await expect(page.getByRole("button", { name: /לשאלה הבאה|לסיכום/ })).toBeVisible();
});

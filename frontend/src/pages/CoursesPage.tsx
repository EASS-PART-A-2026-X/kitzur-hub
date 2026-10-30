/**
 * Course list. Stage 2.1 renders names only; cards and the create dialog come in 2.4.
 */
import { List, Stack, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { QueryState } from "../components/QueryState";
import { useCourses } from "../hooks/useCourses";

/**
 * Show every course, with the shared loading, error and empty states.
 *
 * @returns The page.
 */
export function CoursesPage() {
  const { t } = useTranslation();
  const courses = useCourses();
  return (
    <Stack>
      <Title order={2}>{t("courses.title")}</Title>
      <QueryState query={courses} empty={t("courses.empty")}>
        {(items) => (
          <List>
            {items.map((course) => (
              <List.Item key={course.id}>
                <span dir="auto">{course.name}</span>
              </List.Item>
            ))}
          </List>
        )}
      </QueryState>
    </Stack>
  );
}

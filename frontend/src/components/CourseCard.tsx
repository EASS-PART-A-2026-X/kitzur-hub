/**
 * Summary card for one course on the courses page.
 */
import { Badge, Card, Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { Course } from "../api/types";
import { ROUTES } from "../config/constants";
import { formatLocal } from "../lib/dates";
import { dirOf } from "../lib/text";
import { DaysLeftBadge } from "./DaysLeftBadge";

/**
 * Show name, code, counts and the next deadline. The whole card is a link.
 *
 * @param props The course.
 * @returns The card.
 */
export function CourseCard({ course }: { course: Course }) {
  const { t, i18n } = useTranslation();
  const nextDue = course.next_due_at ?? null;
  return (
    <Card
      component={Link}
      to={ROUTES.course(course.id)}
      withBorder
      padding="lg"
      aria-label={course.name}
    >
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap">
          <Text fw={600} dir={dirOf(course.name)} lineClamp={2}>
            {course.name}
          </Text>
          <Badge variant="outline" dir={dirOf(course.code)} style={{ flexShrink: 0 }}>
            {course.code}
          </Badge>
        </Group>
        <Text size="sm" c="dimmed">
          {course.semester} · {t("courses.lectures", { count: course.lecture_count ?? 0 })} ·{" "}
          {t("courses.openTasks", { count: course.open_task_count ?? 0 })}
        </Text>
        {nextDue ? (
          <Group gap="xs">
            <Text size="sm">
              {t("courses.nextDeadline", { date: formatLocal(nextDue, i18n.language) })}
            </Text>
            <DaysLeftBadge dueAt={nextDue} />
          </Group>
        ) : (
          <Text size="sm" c="dimmed">
            {t("courses.noDeadline")}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

/**
 * Course list: a card per course and a "new course" dialog.
 */
import { Button, Group, SimpleGrid, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { CourseCard } from "../components/CourseCard";
import { CourseFormModal } from "../components/CourseFormModal";
import { QueryState } from "../components/QueryState";
import { ROUTES } from "../config/constants";
import { useCourses } from "../hooks/useCourses";

/**
 * Show every course; creating one opens it right away.
 *
 * @returns The page.
 */
export function CoursesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const courses = useCourses();
  const [creating, { open, close }] = useDisclosure(false);
  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>{t("courses.title")}</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={open}>
          {t("courses.new")}
        </Button>
      </Group>
      <QueryState query={courses} empty={t("courses.empty")}>
        {(items) => (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {items.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </SimpleGrid>
        )}
      </QueryState>
      <CourseFormModal
        opened={creating}
        onClose={close}
        onSaved={(course) => navigate(ROUTES.course(course.id))}
      />
    </Stack>
  );
}

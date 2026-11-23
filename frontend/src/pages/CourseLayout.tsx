/**
 * Course page frame: header with course details and actions, tabs, and the active tab.
 */
import { Badge, Button, Group, Stack, Tabs, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate } from "react-router";
import type { Course } from "../api/types";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { CourseFormModal } from "../components/CourseFormModal";
import { QueryState } from "../components/QueryState";
import { COURSE_TABS, type CourseTab, ROUTES } from "../config/constants";
import { type CourseOutletContext, useCourseId } from "../hooks/useCourseRoute";
import { useCourse, useDeleteCourse } from "../hooks/useCourses";
import { useNotify } from "../hooks/useNotify";
import { formatLocal } from "../lib/dates";
import { dirOf } from "../lib/text";
import { NotFoundPage } from "./NotFoundPage";

/**
 * Validate the URL, load the course and render its frame.
 *
 * @returns The course page or the not-found page.
 */
export function CourseLayout() {
  const courseId = useCourseId();
  if (courseId === null) return <NotFoundPage />;
  return <LoadedCourse courseId={courseId} />;
}

/**
 * Course frame once the id is known to be well formed.
 *
 * @param props The course id.
 * @returns Loading, error or the course frame.
 */
function LoadedCourse({ courseId }: { courseId: number }) {
  const course = useCourse(courseId);
  return (
    <QueryState query={course} skeletonRows={4}>
      {(data) => <CourseFrame course={data} />}
    </QueryState>
  );
}

/**
 * Header, edit/delete dialogs and router-driven tabs.
 *
 * @param props The loaded course.
 * @returns The frame with the active tab inside.
 */
function CourseFrame({ course }: { course: Course }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const notify = useNotify();
  const remove = useDeleteCourse(course.id);
  const [editing, edit] = useDisclosure(false);
  const [confirming, confirm] = useDisclosure(false);
  const activeTab = COURSE_TABS.find((tab) => pathname.endsWith(`/${tab}`)) ?? COURSE_TABS[0];
  const context: CourseOutletContext = { course };

  /** Delete the course and go back to the list. */
  const deleteCourse = () =>
    remove.mutate(undefined, {
      onSuccess: () => {
        notify.success(t("courses.deleted"));
        navigate(ROUTES.courses);
      },
      onError: (error) => {
        confirm.close();
        notify.error(error);
      },
    });

  return (
    <Stack>
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Group gap="sm">
            <Title order={2} dir={dirOf(course.name)}>
              {course.name}
            </Title>
            <Badge variant="outline" dir={dirOf(course.code)}>
              {course.code}
            </Badge>
          </Group>
          <Text c="dimmed" size="sm">
            {course.semester}
            {course.exam_date &&
              ` · ${t("courses.examDate", { date: formatLocal(course.exam_date, i18n.language) })}`}
          </Text>
        </Stack>
        <Group gap="xs">
          <Button variant="default" leftSection={<IconPencil size={16} />} onClick={edit.open}>
            {t("common.edit")}
          </Button>
          <Button
            variant="light"
            color="red"
            leftSection={<IconTrash size={16} />}
            onClick={confirm.open}
          >
            {t("common.delete")}
          </Button>
        </Group>
      </Group>

      <Tabs
        value={activeTab}
        onChange={(tab) => tab && navigate(ROUTES.courseTab(course.id, tab as CourseTab))}
      >
        <Tabs.List aria-label={t("courseTabs.label")}>
          {COURSE_TABS.map((tab) => (
            <Tabs.Tab key={tab} value={tab}>
              {t(`courseTabs.${tab}`)}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
      <Outlet context={context} />

      <CourseFormModal opened={editing} onClose={edit.close} course={course} />
      <ConfirmDialog
        opened={confirming}
        title={t("courses.deleteTitle")}
        message={t("courses.deleteConfirm", { name: course.name })}
        loading={remove.isPending}
        onConfirm={deleteCourse}
        onClose={confirm.close}
      />
    </Stack>
  );
}

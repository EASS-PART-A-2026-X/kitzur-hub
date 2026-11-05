/**
 * Create or edit a course in a modal form.
 */
import { Button, Group, Modal, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Course, CourseCreate } from "../api/types";
import { FIELD_LIMITS } from "../config/constants";
import { useCreateCourse, useUpdateCourse } from "../hooks/useCourses";
import { useNotify } from "../hooks/useNotify";
import { useServerErrors } from "../hooks/useServerErrors";
import { fromInput } from "../lib/dates";

interface CourseFormModalProps {
  opened: boolean;
  onClose: () => void;
  /** Course to edit; omit to create a new one. */
  course?: Course;
  /** Called with the saved course. */
  onSaved?: (course: Course) => void;
}

interface CourseFormValues {
  name: string;
  code: string;
  semester: string;
  exam_date: string;
}

/**
 * Initial form values for a course, or empty ones for a new course.
 *
 * @param course Existing course, if editing.
 * @returns Form values.
 */
function toValues(course?: Course): CourseFormValues {
  return {
    name: course?.name ?? "",
    code: course?.code ?? "",
    semester: course?.semester ?? "",
    exam_date: course?.exam_date ?? "",
  };
}

/**
 * Course form. Required fields and lengths are checked here for quick feedback;
 * the server repeats every check and its 422 messages land on the same fields.
 *
 * @param props Modal state, the course to edit, and callbacks.
 * @returns The modal.
 */
export function CourseFormModal({ opened, onClose, course, onSaved }: CourseFormModalProps) {
  const { t } = useTranslation();
  const notify = useNotify();
  const applyServerErrors = useServerErrors();
  const create = useCreateCourse();
  const update = useUpdateCourse(course?.id ?? 0);
  const saving = create.isPending || update.isPending;
  const required = (value: string) => (value.trim() ? null : t("validation.missing"));

  const form = useForm<CourseFormValues>({
    initialValues: toValues(course),
    validate: { name: required, code: required, semester: required },
  });

  // Re-seed the form whenever it opens, so it shows the latest saved values.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only reset on open
  useEffect(() => {
    if (opened) form.setValues(toValues(course));
  }, [opened]);

  /** Send the form to the server and close on success. */
  const submit = (values: CourseFormValues) => {
    const body: CourseCreate = {
      name: values.name,
      code: values.code,
      semester: values.semester,
      exam_date: fromInput(values.exam_date),
    };
    const handlers = {
      onSuccess: (saved: Course) => {
        notify.success(t(course ? "courses.saved" : "courses.created"));
        onSaved?.(saved);
        onClose();
      },
      onError: (error: unknown) => applyServerErrors(form, error),
    };
    if (course) update.mutate(body, handlers);
    else create.mutate(body, handlers);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t(course ? "courses.edit" : "courses.new")}
      centered
    >
      <form onSubmit={form.onSubmit(submit)} noValidate>
        <Stack>
          <TextInput
            label={t("courses.fields.name")}
            required
            maxLength={FIELD_LIMITS.courseName}
            dir="auto"
            data-autofocus
            {...form.getInputProps("name")}
          />
          <Group grow>
            <TextInput
              label={t("courses.fields.code")}
              required
              maxLength={FIELD_LIMITS.courseCode}
              dir="auto"
              {...form.getInputProps("code")}
            />
            <TextInput
              label={t("courses.fields.semester")}
              required
              maxLength={FIELD_LIMITS.courseSemester}
              dir="auto"
              {...form.getInputProps("semester")}
            />
          </Group>
          <TextInput
            type="date"
            label={t("courses.fields.examDate")}
            {...form.getInputProps("exam_date")}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={saving}>
              {t(course ? "common.save" : "common.create")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

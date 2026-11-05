/**
 * Edit a lecture's title and date.
 */
import { Button, Group, Modal, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { LectureDetail } from "../api/types";
import { FIELD_LIMITS } from "../config/constants";
import { useUpdateLecture } from "../hooks/useLectures";
import { useNotify } from "../hooks/useNotify";
import { useServerErrors } from "../hooks/useServerErrors";
import { fromInput } from "../lib/dates";

interface LectureFormModalProps {
  lecture: LectureDetail;
  opened: boolean;
  onClose: () => void;
}

interface LectureFormValues {
  title: string;
  held_on: string;
}

/**
 * Lecture metadata form. The transcript itself is read-only by design.
 *
 * @param props The lecture and modal state.
 * @returns The modal.
 */
export function LectureFormModal({ lecture, opened, onClose }: LectureFormModalProps) {
  const { t } = useTranslation();
  const notify = useNotify();
  const applyServerErrors = useServerErrors();
  const update = useUpdateLecture(lecture.id);
  const initial = { title: lecture.title, held_on: lecture.held_on ?? "" };
  const form = useForm<LectureFormValues>({
    initialValues: initial,
    validate: { title: (value) => (value.trim() ? null : t("validation.missing")) },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: only reset on open
  useEffect(() => {
    if (opened) form.setValues(initial);
  }, [opened]);

  /** Save the changes and close on success. */
  const submit = (values: LectureFormValues) =>
    update.mutate(
      { title: values.title, held_on: fromInput(values.held_on) },
      {
        onSuccess: () => {
          notify.success(t("lectures.saved"));
          onClose();
        },
        onError: (error) => applyServerErrors(form, error),
      },
    );

  return (
    <Modal opened={opened} onClose={onClose} title={t("lectures.edit")} centered>
      <form onSubmit={form.onSubmit(submit)} noValidate>
        <Stack>
          <TextInput
            label={t("lectures.fields.title")}
            required
            maxLength={FIELD_LIMITS.lectureTitle}
            dir="auto"
            data-autofocus
            {...form.getInputProps("title")}
          />
          <TextInput
            type="date"
            label={t("lectures.fields.heldOn")}
            {...form.getInputProps("held_on")}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={update.isPending}>
              {t("common.save")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

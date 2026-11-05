/**
 * Create or edit a task in a modal form.
 */
import { Button, Group, Modal, NumberInput, Select, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Task, TaskCreate, TaskKind, TaskStatus } from "../api/types";
import { FIELD_LIMITS, TASK_KINDS, TASK_STATUSES } from "../config/constants";
import { useNotify } from "../hooks/useNotify";
import { useServerErrors } from "../hooks/useServerErrors";
import { useCreateTask, useUpdateTask } from "../hooks/useTasks";
import { fromInput, toDateTimeInput } from "../lib/dates";

interface TaskFormModalProps {
  courseId: number;
  opened: boolean;
  onClose: () => void;
  /** Task to edit; omit to create a new one. */
  task?: Task;
}

interface TaskFormValues {
  title: string;
  kind: TaskKind;
  due_at: string;
  weight_pct: number | string;
  status: TaskStatus;
}

/**
 * Initial form values for a task, or defaults for a new one.
 *
 * @param task Existing task, if editing.
 * @returns Form values.
 */
function toValues(task?: Task): TaskFormValues {
  return {
    title: task?.title ?? "",
    kind: task?.kind ?? "hw",
    due_at: toDateTimeInput(task?.due_at),
    weight_pct: task?.weight_pct ?? "",
    status: task?.status ?? "todo",
  };
}

/**
 * Task form with the same client-then-server validation as the course form.
 *
 * @param props Course, modal state and the task to edit.
 * @returns The modal.
 */
export function TaskFormModal({ courseId, opened, onClose, task }: TaskFormModalProps) {
  const { t } = useTranslation();
  const notify = useNotify();
  const applyServerErrors = useServerErrors();
  const create = useCreateTask(courseId);
  const update = useUpdateTask(courseId);

  const form = useForm<TaskFormValues>({
    initialValues: toValues(task),
    validate: { title: (value) => (value.trim() ? null : t("validation.missing")) },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: only reset on open
  useEffect(() => {
    if (opened) form.setValues(toValues(task));
  }, [opened]);

  /** Send the form to the server and close on success. */
  const submit = (values: TaskFormValues) => {
    const body: TaskCreate = {
      title: values.title,
      kind: values.kind,
      status: values.status,
      due_at: fromInput(values.due_at),
      weight_pct: values.weight_pct === "" ? null : Number(values.weight_pct),
    };
    const handlers = {
      onSuccess: () => {
        notify.success(t(task ? "tasks.saved" : "tasks.created"));
        onClose();
      },
      onError: (error: unknown) => applyServerErrors(form, error),
    };
    if (task) update.mutate({ taskId: task.id, changes: body }, handlers);
    else create.mutate(body, handlers);
  };

  return (
    <Modal opened={opened} onClose={onClose} title={t(task ? "tasks.edit" : "tasks.new")} centered>
      <form onSubmit={form.onSubmit(submit)} noValidate>
        <Stack>
          <TextInput
            label={t("tasks.fields.title")}
            required
            maxLength={FIELD_LIMITS.taskTitle}
            dir="auto"
            data-autofocus
            {...form.getInputProps("title")}
          />
          <Group grow>
            <Select
              label={t("tasks.fields.kind")}
              data={TASK_KINDS.map((kind) => ({ value: kind, label: t(`tasks.kinds.${kind}`) }))}
              allowDeselect={false}
              {...form.getInputProps("kind")}
            />
            <Select
              label={t("tasks.fields.status")}
              data={TASK_STATUSES.map((s) => ({ value: s, label: t(`tasks.statuses.${s}`) }))}
              allowDeselect={false}
              {...form.getInputProps("status")}
            />
          </Group>
          <Group grow>
            <TextInput
              type="datetime-local"
              label={t("tasks.fields.dueAt")}
              {...form.getInputProps("due_at")}
            />
            <NumberInput
              label={t("tasks.fields.weight")}
              min={0}
              max={100}
              allowDecimal={false}
              {...form.getInputProps("weight_pct")}
            />
          </Group>
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {t(task ? "common.save" : "common.create")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

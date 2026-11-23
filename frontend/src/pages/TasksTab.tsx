/**
 * Tasks tab: status filter, task list, and create/edit/delete.
 */
import { Button, Group, SegmentedControl, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Task, TaskStatus } from "../api/types";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { QueryState } from "../components/QueryState";
import { TaskFormModal } from "../components/TaskFormModal";
import { TaskRow } from "../components/TaskRow";
import { TASK_STATUSES } from "../config/constants";
import { useCurrentCourse } from "../hooks/useCourseRoute";
import { useNotify } from "../hooks/useNotify";
import { useDeleteTask, useTasks, useUpdateTask } from "../hooks/useTasks";

const ALL = "all";

/**
 * List the course's tasks with the shared four states.
 *
 * @returns The tab content.
 */
export function TasksTab() {
  const { t } = useTranslation();
  const course = useCurrentCourse();
  const notify = useNotify();
  const [filter, setFilter] = useState<TaskStatus | typeof ALL>(ALL);
  const tasks = useTasks(course.id, filter === ALL ? null : filter);
  const update = useUpdateTask(course.id);
  const remove = useDeleteTask(course.id);
  const [formOpen, form] = useDisclosure(false);
  const [editing, setEditing] = useState<Task | undefined>();
  const [deleting, setDeleting] = useState<Task | null>(null);

  /** Open the form, empty for a new task or filled for an existing one. */
  const openForm = (task?: Task) => {
    setEditing(task);
    form.open();
  };

  /** Delete the task chosen in the confirmation dialog. */
  const confirmDelete = () => {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: () => notify.success(t("tasks.deleted")),
      onError: notify.error,
      onSettled: () => setDeleting(null),
    });
  };

  return (
    <Stack>
      <Group justify="space-between">
        <SegmentedControl
          aria-label={t("tasks.filterLabel")}
          value={filter}
          onChange={(value) => setFilter(value as TaskStatus | typeof ALL)}
          data={[
            { value: ALL, label: t("tasks.filterAll") },
            ...TASK_STATUSES.map((s) => ({ value: s, label: t(`tasks.statuses.${s}`) })),
          ]}
        />
        <Button leftSection={<IconPlus size={16} />} onClick={() => openForm()}>
          {t("tasks.new")}
        </Button>
      </Group>

      <QueryState query={tasks} empty={t("tasks.empty")}>
        {(items) => (
          <Stack gap="xs">
            {items.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                busy={update.isPending && update.variables?.taskId === task.id}
                onStatusChange={(status) =>
                  update.mutate({ taskId: task.id, changes: { status } }, { onError: notify.error })
                }
                onEdit={() => openForm(task)}
                onDelete={() => setDeleting(task)}
              />
            ))}
          </Stack>
        )}
      </QueryState>

      <TaskFormModal courseId={course.id} opened={formOpen} onClose={form.close} task={editing} />
      <ConfirmDialog
        opened={deleting !== null}
        title={t("tasks.deleteTitle")}
        message={t("tasks.deleteConfirm", { title: deleting?.title ?? "" })}
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </Stack>
  );
}

/**
 * One task in the task list, with inline status change, edit and delete.
 */
import { ActionIcon, Badge, Group, Paper, Select, Stack, Text } from "@mantine/core";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import type { Task, TaskStatus } from "../api/types";
import { TASK_STATUSES } from "../config/constants";
import { formatLocal } from "../lib/dates";
import { DaysLeftBadge } from "./DaysLeftBadge";

interface TaskRowProps {
  task: Task;
  /** Disables the status control while a change is being saved. */
  busy?: boolean;
  onStatusChange: (status: TaskStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Render a task. Finished tasks are dimmed and show no urgency badge.
 *
 * @param props The task and its action handlers.
 * @returns The row.
 */
export function TaskRow({ task, busy = false, onStatusChange, onEdit, onDelete }: TaskRowProps) {
  const { t, i18n } = useTranslation();
  const done = task.status === "done";
  return (
    <Paper withBorder p="sm" opacity={done ? 0.6 : 1}>
      {/* wrap: on narrow screens the actions drop below the title instead of squeezing it */}
      <Group justify="space-between" align="flex-start" gap="xs">
        <Stack gap={4}>
          <Group gap="xs">
            <Text fw={500} dir="auto" td={done ? "line-through" : undefined}>
              {task.title}
            </Text>
            <Badge variant="light" size="sm">
              {t(`tasks.kinds.${task.kind}`)}
            </Badge>
          </Group>
          <Group gap="xs">
            <Text size="sm" c="dimmed">
              {task.due_at ? formatLocal(task.due_at, i18n.language) : t("tasks.noDueDate")}
            </Text>
            {task.due_at && <DaysLeftBadge dueAt={task.due_at} done={done} />}
            {task.weight_pct != null && (
              <Text size="sm" c="dimmed">
                {t("tasks.weight", { weight: task.weight_pct })}
              </Text>
            )}
          </Group>
        </Stack>
        <Group gap="xs" wrap="nowrap">
          <Select
            aria-label={`${t("tasks.fields.status")}: ${task.title}`}
            w={120}
            size="xs"
            value={task.status}
            disabled={busy}
            allowDeselect={false}
            data={TASK_STATUSES.map((s) => ({ value: s, label: t(`tasks.statuses.${s}`) }))}
            onChange={(value) => value && onStatusChange(value as TaskStatus)}
          />
          <ActionIcon
            variant="subtle"
            aria-label={`${t("common.edit")}: ${task.title}`}
            onClick={onEdit}
          >
            <IconPencil size={18} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            aria-label={`${t("common.delete")}: ${task.title}`}
            onClick={onDelete}
          >
            <IconTrash size={18} />
          </ActionIcon>
        </Group>
      </Group>
    </Paper>
  );
}

/**
 * Badge with the time left until a deadline.
 */
import { Badge } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { DEADLINE_SOON_DAYS } from "../config/constants";
import { daysUntil } from "../lib/dates";

interface DaysLeftBadgeProps {
  /** Wall-clock deadline ("YYYY-MM-DDTHH:mm:ss"). */
  dueAt: string;
  /** Finished work shows no urgency. */
  done?: boolean;
}

/**
 * Red when overdue, orange when due within DEADLINE_SOON_DAYS, grey otherwise.
 *
 * @param props Deadline and completion state.
 * @returns The badge, or null for finished tasks.
 */
export function DaysLeftBadge({ dueAt, done = false }: DaysLeftBadgeProps) {
  const { t } = useTranslation();
  if (done) return null;
  const days = daysUntil(dueAt);
  let label: string;
  if (days === 0) label = t("deadline.today");
  else if (days === 1) label = t("deadline.tomorrow");
  else if (days > 0) label = t("deadline.inDays", { count: days });
  else label = t("deadline.overdue", { count: -days });
  const color = days < 0 ? "red" : days <= DEADLINE_SOON_DAYS ? "orange" : "gray";
  return (
    <Badge color={color} variant="light">
      {label}
    </Badge>
  );
}

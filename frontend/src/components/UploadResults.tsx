/**
 * Per-file outcome of an upload queue.
 */
import { Anchor, Button, Group, Loader, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useErrorMessage } from "../hooks/useErrorMessage";
import type { UploadRow } from "../hooks/useUploadQueue";
import { dirOf } from "../lib/text";

interface UploadResultsProps<T> {
  rows: UploadRow<T>[];
  /** Link for a finished upload (or for the existing item on a 409). */
  linkFor: (row: UploadRow<T>) => string | null;
  /** Text for a finished upload. */
  describeSuccess: (result: T) => ReactNode;
  onClear: () => void;
}

/**
 * Show each file with a spinner, a success line or the translated error.
 *
 * @param props Rows and how to describe them.
 * @returns The list, or nothing when the queue is empty.
 */
export function UploadResults<T>({
  rows,
  linkFor,
  describeSuccess,
  onClear,
}: UploadResultsProps<T>) {
  const { t } = useTranslation();
  const describe = useErrorMessage();
  if (rows.length === 0) return null;
  const busy = rows.some((row) => row.status === "waiting" || row.status === "uploading");
  return (
    <Paper withBorder p="sm" aria-live="polite">
      <Stack gap="xs">
        {rows.map((row) => {
          const link = linkFor(row);
          return (
            <Group key={row.key} gap="sm" wrap="nowrap">
              {row.status === "done" ? (
                <ThemeIcon color="teal" size="sm" radius="xl">
                  <IconCheck size={14} />
                </ThemeIcon>
              ) : row.status === "error" ? (
                <ThemeIcon color="red" size="sm" radius="xl">
                  <IconX size={14} />
                </ThemeIcon>
              ) : (
                <Loader size="xs" />
              )}
              <Text size="sm" fw={500} dir={dirOf(row.name)}>
                {row.name}
              </Text>
              <Text size="sm" c={row.status === "error" ? "red" : "dimmed"}>
                {row.status === "done" && row.result !== undefined && describeSuccess(row.result)}
                {row.status === "error" && describe(row.error).summary}
                {row.status === "waiting" && t("upload.waiting")}
              </Text>
              {link && (
                <Anchor component={Link} to={link} size="sm">
                  {t("upload.open")}
                </Anchor>
              )}
            </Group>
          );
        })}
        {!busy && (
          <Button variant="subtle" size="xs" onClick={onClear} style={{ alignSelf: "flex-start" }}>
            {t("upload.clear")}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}

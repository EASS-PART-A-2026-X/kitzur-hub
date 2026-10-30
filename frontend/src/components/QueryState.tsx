/**
 * The one way data views render loading, error, empty and loaded states.
 */
import { Alert, Button, Skeleton, Stack, Text } from "@mantine/core";
import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useErrorMessage } from "../hooks/useErrorMessage";

/** Stable keys for placeholder rows (the rows have no identity of their own). */
const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f"];

interface QueryStateProps<T> {
  /** The query to render. */
  query: UseQueryResult<T>;
  /** Content for loaded data. */
  children: (data: T) => ReactNode;
  /** Returns true when loaded data counts as empty. Defaults to empty arrays. */
  isEmpty?: (data: T) => boolean;
  /** What to show for empty data: a sentence that tells the user what to do first. */
  empty?: ReactNode;
  /** Number of skeleton rows while loading. */
  skeletonRows?: number;
}

/**
 * Render a query in exactly one of its four states.
 *
 * @param props Query, renderers and empty-state content.
 * @returns Skeleton, error alert with retry, empty message, or the content.
 */
export function QueryState<T>({
  query,
  children,
  isEmpty = (data) => Array.isArray(data) && data.length === 0,
  empty,
  skeletonRows = 3,
}: QueryStateProps<T>) {
  const { t } = useTranslation();
  const describe = useErrorMessage();

  if (query.isPending) {
    return (
      <Stack aria-busy="true" aria-label={t("common.loading")}>
        {SKELETON_KEYS.slice(0, skeletonRows).map((key) => (
          <Skeleton key={key} height={48} />
        ))}
      </Stack>
    );
  }
  if (query.isError) {
    return (
      <Alert color="red" role="alert">
        <Stack gap="xs" align="flex-start">
          <Text>{describe(query.error).summary}</Text>
          <Button size="xs" variant="light" onClick={() => void query.refetch()}>
            {t("common.retry")}
          </Button>
        </Stack>
      </Alert>
    );
  }
  if (empty !== undefined && isEmpty(query.data)) {
    return <Text c="dimmed">{empty}</Text>;
  }
  return <>{children(query.data)}</>;
}

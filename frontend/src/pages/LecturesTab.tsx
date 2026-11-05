/**
 * Lectures tab: transcript drop zone, upload results and the lecture list.
 */
import { Badge, Group, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ApiError } from "../api/errors";
import type { Lecture } from "../api/types";
import { FileDropZone } from "../components/FileDropZone";
import { QueryState } from "../components/QueryState";
import { UploadResults } from "../components/UploadResults";
import { ROUTES, TRANSCRIPT_EXTENSIONS } from "../config/constants";
import { useCurrentCourse } from "../hooks/useCourseRoute";
import { useImportLecture, useLectures } from "../hooks/useLectures";
import { type UploadRow, useUploadQueue } from "../hooks/useUploadQueue";
import { formatLocal } from "../lib/dates";
import { formatClock } from "../lib/format";
import { dirOf } from "../lib/text";

/**
 * Where an upload row should link: the new lecture, or the existing one on a 409.
 *
 * @param row Upload row.
 * @returns A lecture URL or null.
 */
function lectureLink(row: UploadRow<Lecture>): string | null {
  if (row.status === "done" && row.result) return ROUTES.lecture(row.result.id);
  if (row.error instanceof ApiError && row.error.kind === "conflict") {
    const existing = (row.error.detail as { lecture_id?: unknown } | null)?.lecture_id;
    if (typeof existing === "number") return ROUTES.lecture(existing);
  }
  return null;
}

/**
 * Upload transcripts and list the course's lectures.
 *
 * @returns The tab content.
 */
export function LecturesTab() {
  const { t } = useTranslation();
  const course = useCurrentCourse();
  const lectures = useLectures(course.id);
  const importLecture = useImportLecture(course.id);
  const queue = useUploadQueue(importLecture.mutateAsync);

  return (
    <Stack>
      <FileDropZone
        title={t("lectures.dropTitle")}
        hint={t("lectures.dropHint", { formats: TRANSCRIPT_EXTENSIONS.join(" ") })}
        onFiles={(files) => void queue.add(files)}
        onTooLarge={(names) => queue.reject(names, new ApiError("too_large", null))}
      />
      <UploadResults
        rows={queue.rows}
        linkFor={lectureLink}
        describeSuccess={(lecture) =>
          t("lectures.imported", { count: lecture.segment_count, title: lecture.title })
        }
        onClear={queue.clearFinished}
      />
      <QueryState query={lectures} empty={t("lectures.empty")}>
        {(items) => (
          <Stack gap="xs">
            {items.map((lecture) => (
              <LectureRow key={lecture.id} lecture={lecture} />
            ))}
          </Stack>
        )}
      </QueryState>
    </Stack>
  );
}

/**
 * One lecture in the list; the title links to the transcript.
 *
 * @param props The lecture.
 * @returns The row.
 */
function LectureRow({ lecture }: { lecture: Lecture }) {
  const { t, i18n } = useTranslation();
  return (
    <Paper
      withBorder
      p="sm"
      component={Link}
      to={ROUTES.lecture(lecture.id)}
      aria-label={lecture.title}
    >
      <Group justify="space-between" gap="xs">
        <Text fw={500} dir={dirOf(lecture.title)}>
          {lecture.title}
        </Text>
        <Group gap="xs">
          <Text size="sm" c="dimmed">
            {lecture.held_on ? formatLocal(lecture.held_on, i18n.language) : t("lectures.noDate")}
          </Text>
          <Text size="sm" c="dimmed">
            {formatClock(lecture.duration_sec)}
          </Text>
          <Badge variant="light" size="sm">
            {t(`lectures.formats.${lecture.source_format}`)}
          </Badge>
        </Group>
      </Group>
    </Paper>
  );
}

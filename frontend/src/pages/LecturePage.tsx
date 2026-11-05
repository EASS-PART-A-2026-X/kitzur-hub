/**
 * Transcript viewer: lecture details, search with highlighting, edit and delete.
 */
import {
  Anchor,
  Badge,
  Button,
  Group,
  Highlight,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { IconArrowRight, IconPencil, IconSearch, IconTrash } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import type { LectureDetail, Segment } from "../api/types";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { LectureFormModal } from "../components/LectureFormModal";
import { QueryState } from "../components/QueryState";
import { ROUTES, SEARCH_DEBOUNCE_MS, TRANSCRIPT_PAGE_SIZE } from "../config/constants";
import { useDeleteLecture, useLecture } from "../hooks/useLectures";
import { useNotify } from "../hooks/useNotify";
import { formatLocal } from "../lib/dates";
import { formatClock } from "../lib/format";
import { dirOf } from "../lib/text";
import { NotFoundPage } from "./NotFoundPage";

/** Speaker label (as stored by the backend) to translation key and badge color. */
const SPEAKERS: Record<
  Segment["speaker"],
  { key: "lecturer" | "student" | "unknown"; color: string }
> = {
  מרצה: { key: "lecturer", color: "indigo" },
  "סטודנט/ית": { key: "student", color: "teal" },
  "לא ידוע": { key: "unknown", color: "gray" },
};

/**
 * Validate the URL and load the lecture.
 *
 * @returns The viewer or the not-found page.
 */
export function LecturePage() {
  const id = Number(useParams().lectureId);
  if (!Number.isInteger(id) || id <= 0) return <NotFoundPage />;
  return <LoadedLecture lectureId={id} />;
}

/**
 * Lecture loader with the shared query states.
 *
 * @param props Lecture id.
 * @returns Loading, error or the viewer.
 */
function LoadedLecture({ lectureId }: { lectureId: number }) {
  const lecture = useLecture(lectureId);
  return (
    <QueryState query={lecture} skeletonRows={6}>
      {(data) => <LectureView lecture={data} />}
    </QueryState>
  );
}

/**
 * Header, actions, search box and the (filtered) transcript.
 *
 * @param props The loaded lecture.
 * @returns The viewer.
 */
function LectureView({ lecture }: { lecture: LectureDetail }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const notify = useNotify();
  const remove = useDeleteLecture(lecture.id);
  const [editing, edit] = useDisclosure(false);
  const [confirming, confirm] = useDisclosure(false);
  const [query, setQuery] = useState("");
  const [debounced] = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const [shown, setShown] = useState(TRANSCRIPT_PAGE_SIZE);
  const backTo = ROUTES.courseTab(lecture.course_id, "lectures");

  // Filtering 1000+ segments is cheap; rendering them all is not, so the list
  // is shown in pages and the search is debounced.
  // A transcript never changes, so a block's position in it is a stable identity.
  const numbered = useMemo(
    () => lecture.segments.map((segment, position) => ({ segment, position })),
    [lecture.segments],
  );
  const visible = useMemo(() => {
    const needle = debounced.toLocaleLowerCase();
    return needle
      ? numbered.filter(({ segment }) => segment.text.toLocaleLowerCase().includes(needle))
      : numbered;
  }, [numbered, debounced]);

  // A new search starts again from the first page of results.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only when the term changes
  useEffect(() => setShown(TRANSCRIPT_PAGE_SIZE), [debounced]);

  /** Delete the lecture and return to the course. */
  const deleteLecture = () =>
    remove.mutate(undefined, {
      onSuccess: () => {
        notify.success(t("lectures.deleted"));
        navigate(backTo);
      },
      onError: (error) => {
        confirm.close();
        notify.error(error);
      },
    });

  return (
    <Stack>
      <Anchor component={Link} to={backTo} size="sm">
        <Group gap={4}>
          <IconArrowRight size={14} />
          {t("lectures.back")}
        </Group>
      </Anchor>
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2} dir={dirOf(lecture.title)}>
            {lecture.title}
          </Title>
          <Text c="dimmed" size="sm">
            {lecture.held_on ? formatLocal(lecture.held_on, i18n.language) : t("lectures.noDate")}
            {" · "}
            {formatClock(lecture.duration_sec)}
            {" · "}
            {t("lectures.segments", { count: lecture.segment_count })}
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

      <TextInput
        leftSection={<IconSearch size={16} />}
        placeholder={t("lectures.searchPlaceholder")}
        aria-label={t("lectures.searchPlaceholder")}
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        dir="auto"
      />
      {debounced && (
        <Text size="sm" c="dimmed" aria-live="polite">
          {t("lectures.matches", { count: visible.length })}
        </Text>
      )}

      <Stack gap="xs">
        {visible.slice(0, shown).map(({ segment, position }) => (
          <SegmentRow key={position} segment={segment} highlight={debounced} />
        ))}
      </Stack>
      {visible.length > shown && (
        <Button variant="light" onClick={() => setShown((n) => n + TRANSCRIPT_PAGE_SIZE)}>
          {t("lectures.showMore", { count: visible.length - shown })}
        </Button>
      )}

      <LectureFormModal lecture={lecture} opened={editing} onClose={edit.close} />
      <ConfirmDialog
        opened={confirming}
        title={t("lectures.deleteTitle")}
        message={t("lectures.deleteConfirm", { title: lecture.title })}
        loading={remove.isPending}
        onConfirm={deleteLecture}
        onClose={confirm.close}
      />
    </Stack>
  );
}

/**
 * One transcript block: time, speaker role and text with search matches marked.
 *
 * @param props The segment and the active search term.
 * @returns The block.
 */
function SegmentRow({ segment, highlight }: { segment: Segment; highlight: string }) {
  const { t } = useTranslation();
  const speaker = SPEAKERS[segment.speaker];
  return (
    <Paper p="sm" withBorder>
      <Group gap="xs" mb={4}>
        <Text size="xs" c="dimmed" ff="monospace">
          {formatClock(segment.start_sec)}
        </Text>
        <Badge size="xs" variant="light" color={speaker.color}>
          {t(`lectures.speakers.${speaker.key}`)}
        </Badge>
      </Group>
      <Highlight highlight={highlight} dir={dirOf(segment.text)} size="sm">
        {segment.text}
      </Highlight>
    </Paper>
  );
}

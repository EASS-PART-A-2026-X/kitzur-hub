/**
 * Practice options and course totals, shown before a session starts.
 */
import {
  Button,
  Group,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { IconPlayerPlay } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import type { Lecture, PracticeSummary, QuestionType } from "../../api/types";
import { PRACTICE_COUNTS } from "../../config/constants";
import type { PracticeOptions } from "../../hooks/usePractice";

const ALL = "all";

interface PracticeSetupProps {
  options: PracticeOptions;
  onChange: (options: PracticeOptions) => void;
  onStart: () => void;
  lectures: Lecture[];
  summary: PracticeSummary | undefined;
}

/**
 * Let the user pick a lecture, a question type and a session size.
 *
 * @param props Current options, lectures to choose from, totals and handlers.
 * @returns The setup panel.
 */
export function PracticeSetup({
  options,
  onChange,
  onStart,
  lectures,
  summary,
}: PracticeSetupProps) {
  const { t } = useTranslation();
  const accuracy = summary?.accuracy;
  return (
    <Stack>
      {summary && (
        <SimpleGrid cols={{ base: 2, sm: 4 }}>
          <Stat label={t("practice.stats.questions")} value={summary.questions} />
          <Stat label={t("practice.stats.attempted")} value={summary.attempted_questions} />
          <Stat label={t("practice.stats.attempts")} value={summary.attempts} />
          <Stat
            label={t("practice.stats.accuracy")}
            value={accuracy == null ? "-" : `${Math.round(accuracy * 100)}%`}
          />
        </SimpleGrid>
      )}
      <Paper withBorder p="md">
        <Stack>
          <Select
            label={t("practice.lecture")}
            value={options.lectureId ? String(options.lectureId) : ALL}
            allowDeselect={false}
            data={[
              { value: ALL, label: t("practice.allLectures") },
              ...lectures.map((lecture) => ({ value: String(lecture.id), label: lecture.title })),
            ]}
            onChange={(value) =>
              onChange({ ...options, lectureId: value && value !== ALL ? Number(value) : null })
            }
          />
          <Group grow align="flex-end">
            <Stack gap={4}>
              <Text size="sm" fw={500}>
                {t("practice.type")}
              </Text>
              <SegmentedControl
                aria-label={t("practice.type")}
                value={options.type ?? ALL}
                onChange={(value) =>
                  onChange({ ...options, type: value === ALL ? null : (value as QuestionType) })
                }
                data={[
                  { value: ALL, label: t("practice.types.all") },
                  { value: "mcq", label: t("practice.types.mcq") },
                  { value: "flashcard", label: t("practice.types.flashcard") },
                ]}
              />
            </Stack>
            <Stack gap={4}>
              <Text size="sm" fw={500}>
                {t("practice.count")}
              </Text>
              <SegmentedControl
                aria-label={t("practice.count")}
                value={String(options.count)}
                onChange={(value) => onChange({ ...options, count: Number(value) })}
                data={PRACTICE_COUNTS.map((n) => ({ value: String(n), label: String(n) }))}
              />
            </Stack>
          </Group>
          <Button leftSection={<IconPlayerPlay size={16} />} onClick={onStart}>
            {t("practice.start")}
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}

/**
 * One number with its label.
 *
 * @param props Label and value.
 * @returns The stat tile.
 */
function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Paper withBorder p="sm">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="xl" fw={600}>
        {value}
      </Text>
    </Paper>
  );
}

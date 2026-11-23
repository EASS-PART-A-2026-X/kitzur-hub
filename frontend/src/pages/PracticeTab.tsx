/**
 * Practice tab: choose options, answer a session of questions, see the score.
 */
import { Button, Group, Paper, Progress, Stack, Text, Title } from "@mantine/core";
import { IconArrowLeft, IconRefresh } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AttemptResult, PracticeQuestion } from "../api/types";
import { PracticeSetup } from "../components/practice/PracticeSetup";
import { QuestionCard } from "../components/practice/QuestionCard";
import { QueryState } from "../components/QueryState";
import { DEFAULT_PRACTICE_COUNT } from "../config/constants";
import { useCurrentCourse } from "../hooks/useCourseRoute";
import { useLectures } from "../hooks/useLectures";
import { useNotify } from "../hooks/useNotify";
import {
  type PracticeOptions,
  useAnswerQuestion,
  usePracticeSession,
  usePracticeSummary,
} from "../hooks/usePractice";

/**
 * Switch between setup and an active session.
 *
 * @returns The tab content.
 */
export function PracticeTab() {
  const course = useCurrentCourse();
  const lectures = useLectures(course.id);
  const summary = usePracticeSummary(course.id);
  const [options, setOptions] = useState<PracticeOptions>({
    count: DEFAULT_PRACTICE_COUNT,
    lectureId: null,
    type: null,
  });
  const [round, setRound] = useState<number | null>(null);
  const session = usePracticeSession(course.id, options, round);

  if (round === null) {
    // The lecture list is needed to choose a lecture, so it goes through the shared
    // states; the totals are a bonus and are simply hidden if they fail to load.
    return (
      <QueryState query={lectures} skeletonRows={3}>
        {(items) => (
          <PracticeSetup
            options={options}
            onChange={setOptions}
            onStart={() => setRound(Date.now())}
            lectures={items}
            summary={summary.data}
          />
        )}
      </QueryState>
    );
  }
  return (
    <QueryState query={session} skeletonRows={4}>
      {(questions) => (
        <PracticeSession
          // A new round remounts the session, which resets its progress.
          key={round}
          courseId={course.id}
          questions={questions}
          onRestart={() => setRound(Date.now())}
          onExit={() => setRound(null)}
        />
      )}
    </QueryState>
  );
}

interface PracticeSessionProps {
  courseId: number;
  questions: PracticeQuestion[];
  onRestart: () => void;
  onExit: () => void;
}

/**
 * Walk through the session's questions one by one, then show the score.
 *
 * @param props Questions and navigation handlers.
 * @returns The current question or the final score.
 */
function PracticeSession({ courseId, questions, onRestart, onExit }: PracticeSessionProps) {
  const { t } = useTranslation();
  const notify = useNotify();
  const answer = useAnswerQuestion(courseId);
  const [position, setPosition] = useState(0);
  const [results, setResults] = useState<Record<number, AttemptResult>>({});

  if (questions.length === 0) {
    return (
      <Stack align="flex-start">
        <Text c="dimmed">{t("practice.noQuestions")}</Text>
        <Button variant="default" onClick={onExit}>
          {t("practice.back")}
        </Button>
      </Stack>
    );
  }

  if (position >= questions.length) {
    const correct = Object.values(results).filter((r) => r.correct).length;
    return (
      <Paper withBorder p="lg">
        <Stack align="flex-start">
          <Title order={3}>{t("practice.done")}</Title>
          <Text size="lg">{t("practice.score", { correct, total: questions.length })}</Text>
          <Group>
            <Button leftSection={<IconRefresh size={16} />} onClick={onRestart}>
              {t("practice.again")}
            </Button>
            <Button variant="default" onClick={onExit}>
              {t("practice.back")}
            </Button>
          </Group>
        </Stack>
      </Paper>
    );
  }

  const question = questions[position];
  const result = results[question.id] ?? null;
  return (
    <Stack>
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {t("practice.progress", { current: position + 1, total: questions.length })}
        </Text>
        <Button variant="subtle" size="xs" onClick={onExit}>
          {t("practice.stop")}
        </Button>
      </Group>
      <Progress value={(position / questions.length) * 100} aria-hidden />
      <QuestionCard
        // Remount per question so a flashcard starts hidden and no option is pre-selected.
        key={question.id}
        question={question}
        result={result}
        sending={answer.isPending}
        onAnswer={(body) =>
          answer.mutate(
            { questionId: question.id, answer: body },
            {
              onSuccess: (graded) => setResults((all) => ({ ...all, [question.id]: graded })),
              onError: notify.error,
            },
          )
        }
      />
      {result && (
        <Button
          rightSection={<IconArrowLeft size={16} />}
          onClick={() => setPosition((p) => p + 1)}
          style={{ alignSelf: "flex-end" }}
        >
          {position + 1 < questions.length ? t("practice.next") : t("practice.finish")}
        </Button>
      )}
    </Stack>
  );
}

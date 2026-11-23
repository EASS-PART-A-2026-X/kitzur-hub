/**
 * One practice question: multiple choice graded by the server, or a self-graded flashcard.
 */
import { Alert, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AttemptCreate, AttemptResult, PracticeQuestion } from "../../api/types";
import { dirOf } from "../../lib/text";

interface QuestionCardProps {
  question: PracticeQuestion;
  /** The graded result once answered, or null before. */
  result: AttemptResult | null;
  /** True while the answer is being sent. */
  sending: boolean;
  onAnswer: (answer: AttemptCreate) => void;
}

/**
 * Render the question in its current state: unanswered, sending, or graded.
 *
 * @param props The question, its result and the answer handler.
 * @returns The card.
 */
export function QuestionCard({ question, result, sending, onAnswer }: QuestionCardProps) {
  return (
    <Paper withBorder p="lg">
      <Stack>
        <Text fw={600} size="lg" dir={dirOf(question.prompt)}>
          {question.prompt}
        </Text>
        {question.type === "mcq" ? (
          <MultipleChoice
            question={question}
            result={result}
            sending={sending}
            onAnswer={onAnswer}
          />
        ) : (
          <Flashcard question={question} result={result} sending={sending} onAnswer={onAnswer} />
        )}
        {result?.explanation && (
          <Alert color="blue" variant="light" dir={dirOf(result.explanation)}>
            {result.explanation}
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}

/**
 * Four options. After grading, the right one turns green and a wrong pick turns red.
 *
 * @param props See QuestionCardProps.
 * @returns The option buttons.
 */
function MultipleChoice({ question, result, sending, onAnswer }: QuestionCardProps) {
  const [chosen, setChosen] = useState<number | null>(null);
  return (
    <Stack gap="xs">
      {question.options.map((option, index) => {
        const isCorrect = result?.correct_index === index;
        const isWrongPick = result !== null && chosen === index && !isCorrect;
        return (
          <Button
            // The backend guarantees distinct options, so the text is a stable key.
            key={`${question.id}-${option}`}
            variant={isCorrect || isWrongPick ? "filled" : "default"}
            color={isCorrect ? "teal" : isWrongPick ? "red" : undefined}
            justify="flex-start"
            h="auto"
            py="xs"
            disabled={result !== null || sending}
            loading={sending && chosen === index}
            leftSection={
              isCorrect ? <IconCheck size={16} /> : isWrongPick ? <IconX size={16} /> : null
            }
            onClick={() => {
              setChosen(index);
              onAnswer({ chosen_index: index });
            }}
            styles={{ label: { whiteSpace: "normal", textAlign: "start" } }}
          >
            <span dir={dirOf(option)}>{option}</span>
          </Button>
        );
      })}
    </Stack>
  );
}

/**
 * Prompt, then the answer on request, then "knew it" / "didn't know".
 *
 * @param props See QuestionCardProps.
 * @returns The flashcard body.
 */
function Flashcard({ question, result, sending, onAnswer }: QuestionCardProps) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);
  if (!revealed) {
    return (
      <Button variant="light" onClick={() => setRevealed(true)}>
        {t("practice.reveal")}
      </Button>
    );
  }
  return (
    <Stack>
      <Paper bg="gray.0" p="md" radius="md">
        <Text dir={dirOf(question.answer)}>{question.answer}</Text>
      </Paper>
      {result === null ? (
        <Group grow>
          <Button color="teal" loading={sending} onClick={() => onAnswer({ knew: true })}>
            {t("practice.knew")}
          </Button>
          <Button
            color="red"
            variant="light"
            disabled={sending}
            onClick={() => onAnswer({ knew: false })}
          >
            {t("practice.didNotKnow")}
          </Button>
        </Group>
      ) : (
        <Text c={result.correct ? "teal" : "red"} fw={500}>
          {t(result.correct ? "practice.markedKnown" : "practice.markedUnknown")}
        </Text>
      )}
    </Stack>
  );
}

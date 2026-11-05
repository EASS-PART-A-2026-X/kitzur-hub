/**
 * Confirmation dialog for destructive actions.
 */
import { Button, Group, Modal, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

interface ConfirmDialogProps {
  opened: boolean;
  title: string;
  message: string;
  /** Shows a spinner on the confirm button while the action runs. */
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Ask before deleting. Confirm is red and is not the default focus.
 *
 * @param props Dialog state, text and handlers.
 * @returns The modal.
 */
export function ConfirmDialog({
  opened,
  title,
  message,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  return (
    <Modal opened={opened} onClose={onClose} title={title} centered>
      <Text dir="auto">{message}</Text>
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onClose} data-autofocus>
          {t("common.cancel")}
        </Button>
        <Button color="red" loading={loading} onClick={onConfirm}>
          {t("common.delete")}
        </Button>
      </Group>
    </Modal>
  );
}

/**
 * Drop area for files, also usable with the keyboard through its button.
 */
import { Button, Group, Stack, Text } from "@mantine/core";
import { Dropzone, type FileRejection } from "@mantine/dropzone";
import { IconUpload } from "@tabler/icons-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { MAX_UPLOAD_BYTES } from "../config/constants";

interface FileDropZoneProps {
  /** Main line, e.g. "Drop transcripts here". */
  title: string;
  /** Second line, e.g. the supported formats. */
  hint: string;
  onFiles: (files: File[]) => void;
  /** Files refused before upload (only size is checked locally). */
  onTooLarge: (names: string[]) => void;
  disabled?: boolean;
}

/**
 * Accept dropped or picked files. File types are not filtered here: the
 * server decides, and its 415 message is shown in the results.
 *
 * @param props Texts and handlers.
 * @returns The drop zone.
 */
export function FileDropZone({ title, hint, onFiles, onTooLarge, disabled }: FileDropZoneProps) {
  const { t } = useTranslation();
  const openRef = useRef<() => void>(null);
  return (
    <Dropzone
      openRef={openRef}
      onDrop={onFiles}
      onReject={(rejections: FileRejection[]) => onTooLarge(rejections.map((r) => r.file.name))}
      maxSize={MAX_UPLOAD_BYTES}
      multiple
      disabled={disabled}
      activateOnClick={false}
    >
      <Group justify="center" gap="lg" mih={110} style={{ pointerEvents: "none" }}>
        <IconUpload size={36} stroke={1.5} />
        <Stack gap={4}>
          <Text fw={500}>{title}</Text>
          <Text size="sm" c="dimmed">
            {hint}
          </Text>
        </Stack>
        <Button
          variant="light"
          style={{ pointerEvents: "all" }}
          onClick={() => openRef.current?.()}
        >
          {t("upload.choose")}
        </Button>
      </Group>
    </Dropzone>
  );
}

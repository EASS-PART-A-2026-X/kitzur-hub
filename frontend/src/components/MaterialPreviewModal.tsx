/**
 * Shows the text extracted from a material, so the user can check it read correctly.
 */
import { Modal, ScrollArea, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useMaterial } from "../hooks/useMaterials";
import { dirOf } from "../lib/text";
import { QueryState } from "./QueryState";

interface MaterialPreviewModalProps {
  /** Material to show, or null when closed. */
  materialId: number | null;
  onClose: () => void;
}

/**
 * Load and display the stored text, keeping its line breaks.
 *
 * @param props Selected material and close handler.
 * @returns The modal.
 */
export function MaterialPreviewModal({ materialId, onClose }: MaterialPreviewModalProps) {
  const { t } = useTranslation();
  const material = useMaterial(materialId);
  return (
    <Modal
      opened={materialId !== null}
      onClose={onClose}
      title={material.data?.filename ?? t("materials.preview")}
      size="xl"
      centered
    >
      <QueryState query={material} skeletonRows={6}>
        {(data) => (
          <ScrollArea.Autosize mah="70vh">
            <Text size="sm" dir={dirOf(data.text)} style={{ whiteSpace: "pre-wrap" }}>
              {data.text}
            </Text>
          </ScrollArea.Autosize>
        )}
      </QueryState>
    </Modal>
  );
}

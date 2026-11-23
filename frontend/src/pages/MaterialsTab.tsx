/**
 * Materials tab: upload syllabus and past exams, check the extracted text, manage the list.
 */
import { ActionIcon, Group, Paper, SegmentedControl, Select, Stack, Text } from "@mantine/core";
import { IconEye, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "../api/errors";
import type { Material, MaterialKind } from "../api/types";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { FileDropZone } from "../components/FileDropZone";
import { MaterialPreviewModal } from "../components/MaterialPreviewModal";
import { QueryState } from "../components/QueryState";
import { UploadResults } from "../components/UploadResults";
import { MATERIAL_EXTENSIONS, MATERIAL_KINDS } from "../config/constants";
import { useCurrentCourse } from "../hooks/useCourseRoute";
import {
  useDeleteMaterial,
  useMaterials,
  useUpdateMaterial,
  useUploadMaterial,
} from "../hooks/useMaterials";
import { useNotify } from "../hooks/useNotify";
import { useUploadQueue } from "../hooks/useUploadQueue";
import { formatInstantDate } from "../lib/dates";
import { dirOf } from "../lib/text";

/**
 * Upload materials of the chosen kind and list everything uploaded so far.
 *
 * @returns The tab content.
 */
export function MaterialsTab() {
  const { t } = useTranslation();
  const course = useCurrentCourse();
  const notify = useNotify();
  const [kind, setKind] = useState<MaterialKind>("syllabus");
  const materials = useMaterials(course.id);
  const upload = useUploadMaterial(course.id, kind);
  const update = useUpdateMaterial();
  const remove = useDeleteMaterial();
  const queue = useUploadQueue(upload.mutateAsync);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Material | null>(null);

  /** Delete the material chosen in the confirmation dialog. */
  const confirmDelete = () => {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: () => notify.success(t("materials.deleted")),
      onError: notify.error,
      onSettled: () => setDeleting(null),
    });
  };

  return (
    <Stack>
      <Group gap="sm">
        <Text size="sm" fw={500}>
          {t("materials.uploadAs")}
        </Text>
        <SegmentedControl
          aria-label={t("materials.uploadAs")}
          value={kind}
          onChange={(value) => setKind(value as MaterialKind)}
          data={MATERIAL_KINDS.map((k) => ({ value: k, label: t(`materials.kinds.${k}`) }))}
        />
      </Group>
      <FileDropZone
        title={t(`materials.dropTitle.${kind}`)}
        hint={t("materials.dropHint", { formats: MATERIAL_EXTENSIONS.join(" ") })}
        onFiles={(files) => void queue.add(files)}
        onTooLarge={(names) => queue.reject(names, new ApiError("too_large", null))}
      />
      <UploadResults
        rows={queue.rows}
        linkFor={() => null}
        describeSuccess={(material) =>
          material.page_count
            ? t("materials.extractedFromPages", {
                count: material.char_count,
                pages: material.page_count,
              })
            : t("materials.extracted", { count: material.char_count })
        }
        onClear={queue.clearFinished}
      />
      <QueryState query={materials} empty={t("materials.empty")}>
        {(items) => (
          <Stack gap="xs">
            {items.map((material) => (
              <MaterialRow
                key={material.id}
                material={material}
                onKindChange={(value) =>
                  update.mutate(
                    { materialId: material.id, changes: { kind: value } },
                    { onError: notify.error },
                  )
                }
                onPreview={() => setPreviewId(material.id)}
                onDelete={() => setDeleting(material)}
              />
            ))}
          </Stack>
        )}
      </QueryState>

      <MaterialPreviewModal materialId={previewId} onClose={() => setPreviewId(null)} />
      <ConfirmDialog
        opened={deleting !== null}
        title={t("materials.deleteTitle")}
        message={t("materials.deleteConfirm", { name: deleting?.filename ?? "" })}
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </Stack>
  );
}

interface MaterialRowProps {
  material: Material;
  onKindChange: (kind: MaterialKind) => void;
  onPreview: () => void;
  onDelete: () => void;
}

/**
 * One material: name, size, upload date, kind selector and actions.
 *
 * @param props The material and its handlers.
 * @returns The row.
 */
function MaterialRow({ material, onKindChange, onPreview, onDelete }: MaterialRowProps) {
  const { t, i18n } = useTranslation();
  return (
    <Paper withBorder p="sm">
      <Group justify="space-between" gap="xs">
        <Stack gap={2}>
          <Text fw={500} dir={dirOf(material.filename)}>
            {material.filename}
          </Text>
          <Text size="sm" c="dimmed">
            {material.page_count
              ? t("materials.pages", { count: material.page_count })
              : t("materials.textFile")}
            {" · "}
            {t("materials.chars", { count: material.char_count })}
            {" · "}
            {formatInstantDate(material.created_at, i18n.language)}
          </Text>
        </Stack>
        <Group gap="xs" wrap="nowrap">
          <Select
            aria-label={`${t("materials.kind")}: ${material.filename}`}
            size="xs"
            w={130}
            value={material.kind}
            allowDeselect={false}
            data={MATERIAL_KINDS.map((k) => ({ value: k, label: t(`materials.kinds.${k}`) }))}
            onChange={(value) => value && onKindChange(value as MaterialKind)}
          />
          <ActionIcon
            variant="subtle"
            aria-label={`${t("materials.preview")}: ${material.filename}`}
            onClick={onPreview}
          >
            <IconEye size={18} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            aria-label={`${t("common.delete")}: ${material.filename}`}
            onClick={onDelete}
          >
            <IconTrash size={18} />
          </ActionIcon>
        </Group>
      </Group>
    </Paper>
  );
}

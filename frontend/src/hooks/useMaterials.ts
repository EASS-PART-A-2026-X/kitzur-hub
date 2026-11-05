/**
 * Course material hooks: list, text preview, upload, change kind and delete.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, request, toFormData } from "../api/client";
import { queryKeys } from "../api/keys";
import type { Material, MaterialDetail, MaterialKind, MaterialUpdate } from "../api/types";
import { LIST_PAGE_SIZE } from "../config/constants";

/**
 * List a course's materials, newest first.
 *
 * @param courseId Course id.
 * @returns The query for the material list.
 */
export function useMaterials(courseId: number) {
  return useQuery({
    queryKey: queryKeys.materials.byCourse(courseId),
    queryFn: (): Promise<Material[]> =>
      request("GET", () =>
        api.GET("/courses/{course_id}/materials", {
          params: { path: { course_id: courseId }, query: { limit: LIST_PAGE_SIZE } },
        }),
      ),
  });
}

/**
 * Load one material with its extracted text, only while `enabled`.
 *
 * @param materialId Material id, or null when nothing is selected.
 * @returns The query for that material.
 */
export function useMaterial(materialId: number | null) {
  return useQuery({
    queryKey: queryKeys.materials.detail(materialId ?? 0),
    enabled: materialId !== null,
    queryFn: (): Promise<MaterialDetail> =>
      request("GET", () =>
        api.GET("/materials/{material_id}", {
          params: { path: { material_id: materialId ?? 0 } },
        }),
      ),
  });
}

/**
 * Refetch material queries after a write.
 *
 * @returns The invalidation function.
 */
function useInvalidateMaterials() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: queryKeys.materials.all });
}

/**
 * Upload one file as a syllabus or past exam.
 *
 * @param courseId Target course.
 * @param kind What the uploaded files are.
 * @returns The mutation; call `mutateAsync(file)`.
 */
export function useUploadMaterial(courseId: number, kind: MaterialKind) {
  const invalidate = useInvalidateMaterials();
  return useMutation({
    mutationFn: (file: File): Promise<Material> =>
      request("POST", () =>
        api.POST("/courses/{course_id}/materials", {
          params: { path: { course_id: courseId } },
          body: { file, kind } as unknown as { file: string; kind: MaterialKind },
          bodySerializer: toFormData,
        }),
      ),
    onSettled: invalidate,
  });
}

/** Variables for useUpdateMaterial. */
export interface MaterialUpdateVars {
  materialId: number;
  changes: MaterialUpdate;
}

/**
 * Change a material's kind or display name.
 *
 * @returns The mutation; call `mutate({ materialId, changes })`.
 */
export function useUpdateMaterial() {
  const invalidate = useInvalidateMaterials();
  return useMutation({
    mutationFn: ({ materialId, changes }: MaterialUpdateVars): Promise<Material> =>
      request("PATCH", () =>
        api.PATCH("/materials/{material_id}", {
          params: { path: { material_id: materialId } },
          body: changes,
        }),
      ),
    onSettled: invalidate,
  });
}

/**
 * Delete a material.
 *
 * @returns The mutation; call `mutate(materialId)`.
 */
export function useDeleteMaterial() {
  const invalidate = useInvalidateMaterials();
  return useMutation({
    mutationFn: (materialId: number): Promise<void> =>
      request("DELETE", () =>
        api.DELETE("/materials/{material_id}", { params: { path: { material_id: materialId } } }),
      ),
    onSettled: invalidate,
  });
}

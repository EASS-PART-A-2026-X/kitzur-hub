/**
 * Uploads dropped files one at a time and keeps a result row per file.
 */
import { useCallback, useState } from "react";

/** State of one file in the queue. */
export interface UploadRow<T> {
  key: string;
  name: string;
  status: "waiting" | "uploading" | "done" | "error";
  result?: T;
  error?: unknown;
}

let nextKey = 0;

/**
 * Hook managing a sequential upload queue.
 *
 * Developer note: files are sent one by one instead of in parallel. Each
 * upload is parsed synchronously by the backend, so parallel requests would
 * only queue up on the server, and sequential order keeps the result rows in
 * the order the user dropped the files.
 *
 * @param upload Sends one file and resolves with the server's result.
 * @returns The rows, a function to enqueue files, a function to record local
 *   rejections, and a function to clear finished rows.
 */
export function useUploadQueue<T>(upload: (file: File) => Promise<T>) {
  const [rows, setRows] = useState<UploadRow<T>[]>([]);

  /** Replace one row by key. */
  const patch = useCallback((key: string, changes: Partial<UploadRow<T>>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...changes } : row)));
  }, []);

  /** Queue files and upload them in order. */
  const add = useCallback(
    async (files: File[]) => {
      const queued = files.map((file) => ({ file, key: `upload-${nextKey++}` }));
      setRows((current) => [
        ...queued.map(({ file, key }) => ({ key, name: file.name, status: "waiting" as const })),
        ...current,
      ]);
      for (const { file, key } of queued) {
        patch(key, { status: "uploading" });
        try {
          patch(key, { status: "done", result: await upload(file) });
        } catch (error) {
          patch(key, { status: "error", error });
        }
      }
    },
    [upload, patch],
  );

  /** Show files the drop zone refused (for example too large) as failed rows. */
  const reject = useCallback((names: string[], error: unknown) => {
    setRows((current) => [
      ...names.map((name) => ({
        key: `upload-${nextKey++}`,
        name,
        status: "error" as const,
        error,
      })),
      ...current,
    ]);
  }, []);

  /** Remove rows that are no longer in progress. */
  const clearFinished = useCallback(() => {
    setRows((current) =>
      current.filter((row) => row.status === "waiting" || row.status === "uploading"),
    );
  }, []);

  return { rows, add, reject, clearFinished };
}

/**
 * Small display formatters.
 */

/**
 * Format seconds as H:MM:SS (or M:SS under an hour), like a video player.
 *
 * @param totalSeconds Non-negative number of seconds.
 * @returns The formatted time.
 */
export function formatClock(totalSeconds: number): string {
  const whole = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const seconds = String(whole % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
}

/**
 * Lower-case file extension including the dot.
 *
 * @param filename A file name.
 * @returns ".md", ".pdf", ..., or "" when there is none.
 */
export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? filename.slice(dot).toLowerCase() : "";
}

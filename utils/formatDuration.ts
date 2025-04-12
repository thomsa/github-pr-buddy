// A helper function to format durations given in seconds
export const formatDuration = (seconds: number | null | string): string => {
  if (seconds === null || seconds === "null") return "N/A";

  if (typeof seconds !== "number") seconds = parseFloat(seconds);

  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];

  if (d > 0) parts.push(`${d}d`);
  parts.push(`${h}h`);
  parts.push(`${m}m`);
  parts.push(`${s}s`);

  return parts.join(" ");
};

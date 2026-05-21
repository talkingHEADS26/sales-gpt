export const MONTHLY_SESSION_LIMIT = 50;
export const MAX_AUDIO_SECONDS_PER_SESSION = 480;

export const MONTHLY_SESSION_LIMIT_REACHED_CODE =
  "MONTHLY_SESSION_LIMIT_REACHED";
export const SESSION_AUDIO_LIMIT_REACHED_CODE =
  "SESSION_AUDIO_LIMIT_REACHED";

export function getCurrentUtcMonthRange(referenceDate = new Date()) {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth();

  return {
    start: new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)).toISOString(),
    end: new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0)).toISOString(),
  };
}

export function formatDurationLabel(totalSeconds: number) {
  const normalizedSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(normalizedSeconds / 60);
  const seconds = normalizedSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

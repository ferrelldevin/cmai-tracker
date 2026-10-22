export const shortDate = (t: number) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
export const windowLabel = (start: number, end: number, index: number) =>
  `Period ${index + 1} · ${shortDate(start)} to ${shortDate(end - 1)}`;
export const timeOfDay = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

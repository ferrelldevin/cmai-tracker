export const shortDate = (t: number) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
export const windowLabel = (start: number, end: number, index: number) =>
  `Period ${index + 1} · ${shortDate(start)} to ${shortDate(end - 1)}`;
export const timeOfDay = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
export const dayAndTime = (t: number) =>
  new Date(t).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
export const ago = (t: number, now = Date.now()) => {
  const days = Math.floor((now - t) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
};
/** A last-activity time for lists: "12 min ago", "today, 3:40 PM", "yesterday, 9:05 AM", "Oct 20". */
export const lastSeen = (t: number, now = Date.now()) => {
  const min = Math.floor((now - t) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const day = (x: number) => new Date(x).toDateString();
  if (day(t) === day(now)) return `today, ${timeOfDay(t)}`;
  if (day(t) === day(now - 86_400_000)) return `yesterday, ${timeOfDay(t)}`;
  return shortDate(t);
};

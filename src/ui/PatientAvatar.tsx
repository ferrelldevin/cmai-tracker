// A colored badge per patient, so the patient being logged for is recognizable at a
// glance (the same job a photo does in a hospital record's patient banner). The color
// comes from the code itself, so it is the same on every screen and every phone.

const COLORS = ["#0b6b66", "#3d4fb0", "#8a3d85", "#9c4416", "#56650f", "#43566b"];

export function avatarColor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

/** The last part of the code: "P-DEMO-A" shows "A", "P-07" shows "07". */
const initials = (id: string) => (id.split("-").filter(Boolean).pop() ?? id).slice(-3).toUpperCase();

export function PatientAvatar({ id, size = 40 }: { id: string; size?: number }) {
  return (
    <span className="avatar" aria-hidden="true" style={{ background: avatarColor(id), width: size, height: size, fontSize: size * 0.38 }}>
      {initials(id)}
    </span>
  );
}

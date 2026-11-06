// Icons picked by Devin from Iconify (https://icon-sets.iconify.design), copied as SVG
// so the mockup needs no icon server. Each one names its set and license; NOTICE has
// the credits. Bodies are the sets' own drawings, unchanged except where a comment says.

import type { ReactNode } from "react";

type Props = { size?: number; className?: string };

// pad adds empty space around an icon that fills its box edge to edge, so it matches the others.
function iconify(viewBox: number, body: string, pad = 0) {
  return function IconifyIcon({ size = 24, className }: Props): ReactNode {
    return (
      <svg
        className={className}
        width={size}
        height={size}
        viewBox={`${-pad} ${-pad} ${viewBox + 2 * pad} ${viewBox + 2 * pad}`}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: body }}
      />
    );
  };
}

// fluent-emoji-high-contrast:rightwards-pushing-hand. Microsoft Fluent Emoji (high contrast), MIT.
export const PushingHand = iconify(
  32,
  '<g fill="none"><g><path fill="currentColor" d="M19.598 27.133c1.274-.347 2.668-1.148 3.864-2.103c1.252-1.001 2.497-2.339 3.245-3.866c.884-1.803 1.19-4.337 1.27-6.59a40.4 40.4 0 0 0-.29-6.37c-.151-1.14-.62-2.314-1.656-3.09a3.7 3.7 0 0 0-1.397-.649a4.03 4.03 0 0 0-1.359-1.83a3.9 3.9 0 0 0-1.325-.645A4.3 4.3 0 0 0 20.817.843A4.74 4.74 0 0 0 18.155 0c-1.749 0-2.778 1.087-3.268 1.911a5 5 0 0 0-.12.216q-.554.185-1.024.503a3.7 3.7 0 0 0-1.34 1.626a4.1 4.1 0 0 0-.292 2.09l.297 2.53a4.2 4.2 0 0 0-1.663 1.301c-.916 1.174-.833 2.473-.557 3.417c.12.416.299.83.488 1.214L0 16.476V18.5l11.69-1.826q.141.268.243.511a.6.6 0 0 1 .045.356a.44.44 0 0 1-.13.219c-1.199.835-1.68 2.17-1.723 3.377c-.043 1.242.35 2.536 1.086 3.657c.91 1.385 2.308 2.44 3.862 2.715c.427.09.864.126 1.294.126q-.2.069-.412.09h-.021l-.031.003L0 30v2.02l16.122-2.303l.018-.002c1.702-.158 2.821-1.366 3.458-2.582m-7.276-15.725c.2-.257.415-.44.63-.57c.836-.503 1.676-.196 1.676-.196v-.002c.69.243 1.316.74 1.859 1.364c.772.888 1.307 1.96 1.539 2.654a.5.5 0 1 0 .948-.316c-.268-.806-.864-1.996-1.733-2.994c-.7-.807-1.625-1.537-2.739-1.783l-.407-3.473s-.317-2.007 2.06-2.218c.479.011.81.221 1.07.577c.301.414.505 1.031.629 1.776c.198 1.185.174 2.524.155 3.547q-.008.4-.009.725a.5.5 0 1 0 1 0c0-.186.004-.408.009-.657c.019-1.021.046-2.492-.169-3.78c-.134-.802-.37-1.6-.807-2.2c-.347-.476-.817-.819-1.42-.94c.279-.463.753-.922 1.542-.922c1.009 0 2.239.674 2.43 1.867l.016-.003q.04.18.078.376c.119.644.196 1.395.244 2.187c.083 1.368.08 2.825.077 4.02V11a.5.5 0 0 0 1 0v-.545c.003-1.194.006-2.686-.08-4.089a19 19 0 0 0-.258-2.308l-.012-.062c.38.155.75.443 1.003.929c.194.374.318.866.323 1.505l.036-.007q.04.33.074.749a21.2 21.2 0 0 1-.082 4.266a.5.5 0 0 0 .992.123a22.2 22.2 0 0 0 .018-5.18q.098.015.194.04c.822.21 1.346.912 1.496 2.045c.417 3.142.579 9.019-.793 11.818c-.892 1.821-2.822 3.496-4.517 4.381a6.6 6.6 0 0 1-1.415.562q-.392.099-.822.192c-.886.186-1.86.311-2.704.126c-.917-.152-1.891-.815-2.57-1.85c-1.07-1.63-1.003-3.565.151-4.323l.02-.013l.011-.007c.906-.74 1.151-1.897.712-2.941l-.025-.06c-.207-.479-.479-.962-.747-1.438l-.241-.432c-.63-1.141-1.109-2.22-.442-3.073"/></g></g>',
  1.5,
);

// ri:user-voice-line. Remix Icon, Apache 2.0.
export const UserVoice = iconify(
  24,
  '<path fill="currentColor" d="M1 22a8 8 0 1 1 16 0h-2a6 6 0 0 0-12 0zm8-9c-3.315 0-6-2.685-6-6s2.685-6 6-6s6 2.685 6 6s-2.685 6-6 6m0-2c2.21 0 4-1.79 4-4s-1.79-4-4-4s-4 1.79-4 4s1.79 4 4 4M21.548.784A13.94 13.94 0 0 1 23 7c0 2.233-.523 4.344-1.452 6.217l-1.645-1.197A12 12 0 0 0 21 7a12 12 0 0 0-1.097-5.02zm-3.302 2.4A10 10 0 0 1 19 7a10 10 0 0 1-.754 3.816l-1.677-1.22A8 8 0 0 0 17 7a8 8 0 0 0-.43-2.596z"/>',
);

// mdi:underwear-outline. Material Design Icons by Pictogrammers, Apache 2.0.
export const Underwear = iconify(
  24,
  '<path fill="currentColor" d="M3 4c-.55 0-1 .45-1 1v5c0 5.5 4.5 10 10 10s10-4.5 10-10V5c0-.55-.45-1-1-1zm17 2v2H4V6zM4 10h16c0 .34 0 .67-.06 1A6.996 6.996 0 0 0 13 17.94c-.33.06-.66.06-1 .06s-.67 0-1-.06A6.996 6.996 0 0 0 4.06 11C4 10.67 4 10.34 4 10m11.04 7.4a4.99 4.99 0 0 1 4.37-4.36a8.18 8.18 0 0 1-4.38 4.37M4.6 13.04c2.28.27 4.1 2.08 4.37 4.37a8.12 8.12 0 0 1-4.37-4.38Z"/>',
);

// iconamoon:playlist-repeat-list. IconaMoon by Dariush Habibpour, CC BY 4.0.
export const RepeatList = iconify(
  24,
  '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2"><path stroke-linejoin="round" d="m19 5l2 2m0 0l-2 2m2-2H7M5 19l-2-2m0 0l2-2m-2 2h14"/><path d="M3 11a4 4 0 0 1 4-4m14 6a4 4 0 0 1-4 4"/></g>',
);

// hugeicons:complaint. Hugeicons, MIT; line width raised from 1.5 to 2 to match the others.
export const Complaint = iconify(
  24,
  '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="m17 7l.005-1.495M17.05 9.9H17m.1 0a.1.1 0 1 1-.2 0a.1.1 0 0 1 .2 0"/><path d="M17 12.567c2.761 0 5-2.142 5-4.784S19.761 3 17 3s-5 2.142-5 4.783c0 1.27.517 2.423 1.36 3.279c.185.188.309.445.259.71a2.66 2.66 0 0 1-.543 1.175a3.25 3.25 0 0 0 2.111-.329h.001c.227-.12.34-.181.42-.193s.195.01.425.052q.479.09.967.09M10 13a3 3 0 1 1-6 0a3 3 0 0 1 6 0"/><path d="M12 21a5 5 0 0 0-10 0"/></g>',
);

// material-symbols:hand-package-outline. Material Symbols by Google, Apache 2.0.
export const HandPackage = iconify(
  24,
  '<path fill="currentColor" d="M15 4H9v7h6zm5 0h-3v7h3zm-5.625 9H8v6h5.55q.525 0 1.013-.175t.887-.525l4.15-3.425q-.2-.2-.45-.3t-.525-.15q-.425-.075-.825.025t-.75.375L14.35 17H10v-2h3.65l1.1-.9q.125-.075.188-.2t.062-.275q0-.25-.187-.437T14.375 13M6 13H4v7h2zm1 0V4q0-.825.588-1.412T9 2h11q.825 0 1.413.588T22 4v7q0 .825-.587 1.413T20 13zm-1 9H4q-.825 0-1.412-.587T2 20v-7q0-.825.588-1.412T4 11h10.375q2.125 0 4.1.725t3.175 2.45l.675 1.025l-5.575 4.65q-.675.575-1.5.863t-1.7.287H7.725q-.275.45-.725.725T6 22"/>',
);

// ph:boxing-glove. Phosphor Icons, MIT.
export const BoxingGlove = iconify(
  256,
  '<path fill="currentColor" d="M168 16h-48a56.06 56.06 0 0 0-56 56h-8a32 32 0 0 0-32 32v29.19a16.1 16.1 0 0 0 3.51 10a8 8 0 0 0 .62.69L64 179.34V216a16 16 0 0 0 16 16h112a16 16 0 0 0 16-16v-38.88l15.38-53.85a16 16 0 0 0 .62-4.39V72a56.06 56.06 0 0 0-56-56m40 102.88l-15.69 54.92a8 8 0 0 0-.31 2.2v40H80v-40a8 8 0 0 0-2.38-5.69L40 133.12V104a16 16 0 0 1 16-16h8v16a8 8 0 0 0 16 0V72a40 40 0 0 1 40-40h48a40 40 0 0 1 40 40Zm-36.42 48.28L153.89 176l17.69 8.84a8 8 0 0 1-7.16 14.32L136 184.94l-28.42 14.22a8 8 0 1 1-7.16-14.32l17.69-8.84l-17.69-8.84a8 8 0 1 1 7.16-14.32L136 167.06l28.42-14.22a8 8 0 1 1 7.16 14.32"/>',
);

// mdi:bottle-tonic-skull-outline. Material Design Icons by Pictogrammers, Apache 2.0.
export const PoisonBottle = iconify(
  24,
  '<path fill="currentColor" d="M13 4h-2l-1-2h4zm1 4V6h1V5H9v1h1v2c-2.76 0-5 2.24-5 5v9h14v-9c0-2.76-2.24-5-5-5m3 12H7v-7c0-1.65 1.35-3 3-3h4c1.65 0 3 1.35 3 3zm-5-9c-2.21 0-4 1.79-4 4c0 1 .39 1.9 1 2.59V19h1.25v-1.5h1.13V19h1.25v-1.5h1.12V19H15v-1.41A3.9 3.9 0 0 0 16 15c0-2.21-1.79-4-4-4m-1.5 4c-.55 0-1-.45-1-1s.45-1 1-1s1 .45 1 1s-.45 1-1 1m.75 1.25L12 15l.75 1.25zM13.5 15c-.55 0-1-.45-1-1s.45-1 1-1s1 .45 1 1s-.45 1-1 1"/>',
);

/**
 * A person walking toward an open door: drawn here for "trying to leave", after the
 * OpenMoji emergency-exit idea (that drawing is CC BY-SA and in color, so it is not copied).
 */
export function LeavingThroughDoor({ size = 24, className }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13 21h9" />
      <path d="M14 21V3h7v18" />
      <path d="M14 3l4 1.5v15L14 21" />
      <circle cx="6" cy="4.5" r="2" />
      <path d="M6.5 8.5L8 14l3 2.5V21" />
      <path d="M8 14l-3 7" />
      <path d="M6.8 10l4.2 1.5" />
      <path d="M6.5 8.5l-3 3" />
    </svg>
  );
}

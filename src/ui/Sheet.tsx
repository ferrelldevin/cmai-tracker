// A bottom sheet (centered on desktop), shared by the patient switcher and log details.
// Built on the native <dialog>, which traps focus, closes on Esc and makes the page behind
// it inert. Design notes: docs/design/notes/002-patient-switcher.md, 003-log-confirmation.md.

import { useEffect, useId, useRef, type ReactNode } from "react";

interface Props {
  open: boolean;
  /** Opened from the keyboard: focus `keyboardFocus`. From touch or mouse: focus the sheet itself, so no focus ring appears. */
  viaKeyboard: boolean;
  /** Selector, inside the sheet, of where a keyboard user starts. */
  keyboardFocus?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
  /** False when the sheet ends in its own action row (log details); the header Close is left out. */
  headerClose?: boolean;
  /** Pinned under the scrolling content, always in reach of the thumb. */
  footer?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

export function Sheet({ open, viaKeyboard, keyboardFocus, title, subtitle, className, headerClose = true, footer, onClose, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // Set the starting focus ourselves; showModal() would otherwise pick the first button.
      // Safari draws the focus ring on any button focused by script, so after a tap the
      // sheet itself takes focus (F-14).
      const start = viaKeyboard && keyboardFocus ? d.querySelector<HTMLElement>(keyboardFocus) : null;
      (start ?? d).focus();
    }
    if (!open && d.open) d.close();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <dialog
      ref={dialog}
      className={className ? `sheet ${className}` : "sheet"}
      tabIndex={-1}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => { if (e.target === dialog.current) onClose(); }}
    >
      <div className="sheet-body">
        <div className="sheet-grab" aria-hidden />
        <div className="sheet-head">
          <div className="sheet-title">
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p className="sheet-sub">{subtitle}</p>}
          </div>
          {headerClose && <button className="ghost small sheet-close" onClick={onClose}>Close</button>}
        </div>
        {open && children}
        {open && footer && <div className="sheet-footer">{footer}</div>}
      </div>
    </dialog>
  );
}

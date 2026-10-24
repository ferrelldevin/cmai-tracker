// A bottom sheet (centered on desktop), shared by the patient switcher and log details.
// Built on the native <dialog>, which traps focus, closes on Esc and makes the page behind
// it inert. Two things the dialog does not do on iPhone, done here (F-16):
// - the page behind keeps scrolling when a drag starts on the sheet, so the page is locked
//   in place while a sheet is open;
// - the grab handle suggests a swipe down closes the sheet, so a downward drag on the
//   handle, the header or the footer does (past 100 px, or a quick flick).
// Design notes: docs/design/notes/002-patient-switcher.md, 003-log-confirmation.md.

import { useEffect, useId, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

const CLOSE_DISTANCE = 100; // px dragged down that closes the sheet
const CLOSE_SPEED = 0.6; // px per ms: a flick closes it sooner
const DRAG_SLOP = 6; // px before a press counts as a drag rather than a tap

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

/** Holds the page still behind a sheet. iOS Safari ignores overflow: hidden on the body, so the body is fixed in place at its scroll position. */
function lockPage() {
  const y = window.scrollY;
  const b = document.body.style;
  Object.assign(b, { position: "fixed", top: `-${y}px`, left: "0", right: "0", width: "100%" });
  return () => {
    Object.assign(b, { position: "", top: "", left: "", right: "", width: "" });
    window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
  };
}

export function Sheet({ open, viaKeyboard, keyboardFocus, title, subtitle, className, headerClose = true, footer, onClose, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; t: number; dy: number; moved: boolean } | null>(null);
  const justDragged = useRef(false);
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
    if (!open) return;
    return lockPage();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function setOffset(dy: number, animate: boolean) {
    const el = body.current;
    if (!el) return;
    el.style.transition = animate ? "transform .2s ease-out" : "none";
    el.style.transform = dy ? `translateY(${dy}px)` : "";
  }

  function onPointerDown(e: ReactPointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // Only the handle, header and footer drag the sheet; the form and list scroll as usual.
    if (!(e.target as HTMLElement).closest(".sheet-grab, .sheet-head, .sheet-footer")) return;
    drag.current = { y: e.clientY, t: e.timeStamp, dy: 0, moved: false };
  }

  function onPointerMove(e: ReactPointerEvent) {
    const g = drag.current;
    if (!g) return;
    const dy = Math.max(0, e.clientY - g.y);
    if (!g.moved && dy < DRAG_SLOP) return;
    if (!g.moved) {
      g.moved = true;
      body.current?.setPointerCapture(e.pointerId);
    }
    g.dy = dy;
    setOffset(dy, false);
  }

  function onPointerUp(e: ReactPointerEvent) {
    const g = drag.current;
    drag.current = null;
    if (!g || !g.moved) return;
    justDragged.current = true;
    window.setTimeout(() => { justDragged.current = false; }, 0);
    const speed = g.dy / Math.max(1, e.timeStamp - g.t);
    if (g.dy > CLOSE_DISTANCE || speed > CLOSE_SPEED) {
      setOffset(window.innerHeight, true);
      window.setTimeout(() => { setOffset(0, false); onClose(); }, 180);
    } else {
      setOffset(0, true);
    }
  }

  return (
    <dialog
      ref={dialog}
      className={className ? `sheet ${className}` : "sheet"}
      tabIndex={-1}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => { if (e.target === dialog.current) onClose(); }}
    >
      <div
        className="sheet-body"
        ref={body}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { drag.current = null; setOffset(0, true); }}
        // A drag that started on a button must not also press it.
        onClickCapture={(e) => { if (justDragged.current) { e.stopPropagation(); e.preventDefault(); } }}
      >
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

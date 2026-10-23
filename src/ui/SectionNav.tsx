// "On this page" bar for long screens: pinned under the patient banner, it marks the section
// in view as you scroll and jumps to a section on tap. One component, so Log, Scores and
// Review all behave the same. Design note: docs/design/notes/001-navigation.md.

import { useEffect, useRef, useState } from "react";

export interface Section { id: string; label: string; detail?: string; ariaLabel?: string }

const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** How far down the screen the pinned bars reach once stuck: the bar's sticky offset plus its height. */
function pinnedBottom(bar: HTMLElement | null) {
  if (!bar) return 0;
  return (parseFloat(getComputedStyle(bar).top) || 0) + bar.offsetHeight;
}

export function SectionNav({ sections, label }: { sections: Section[]; label: string }) {
  const bar = useRef<HTMLElement>(null);
  const [active, setActive] = useState(sections[0]?.id);
  const jumping = useRef<number | null>(null);

  // Scroll tracking: the active section is the last one whose top has passed under the bar.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (jumping.current !== null) return;
      const line = pinnedBottom(bar.current) + 24;
      let current = sections[0]?.id;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) current = s.id;
      }
      // At the very bottom the last section is the one being read, even if it is short.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = sections[sections.length - 1]?.id;
      setActive(current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [sections]);

  // Keep the active chip visible inside the bar without moving the page.
  useEffect(() => {
    const chip = bar.current?.querySelector<HTMLElement>(`[data-section="${active}"]`);
    const track = bar.current;
    if (!chip || !track) return;
    const left = chip.offsetLeft - track.clientWidth / 2 + chip.clientWidth / 2;
    track.scrollTo({ left, behavior: reduceMotion() ? "auto" : "smooth" });
  }, [active]);

  function jump(e: React.MouseEvent, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - pinnedBottom(bar.current) - 8;
    setActive(id);
    // Hold the highlight on the tapped chip while the page scrolls to it.
    if (jumping.current !== null) clearTimeout(jumping.current);
    jumping.current = window.setTimeout(() => { jumping.current = null; }, reduceMotion() ? 50 : 700);
    window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion() ? "auto" : "smooth" });
    // Move focus for keyboard and screen-reader users, without a second scroll.
    const heading = el.querySelector<HTMLElement>("h2, h3") ?? el;
    if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }

  return (
    <nav className="section-nav" aria-label={label} ref={bar}>
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          data-section={s.id}
          className={s.id === active ? "chip on" : "chip"}
          aria-current={s.id === active ? "location" : undefined}
          aria-label={s.ariaLabel}
          onClick={(e) => jump(e, s.id)}
        >
          {s.label}
          {s.detail && <span className="chip-detail">{s.detail}</span>}
        </a>
      ))}
    </nav>
  );
}

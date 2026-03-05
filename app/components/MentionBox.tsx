// app/MentionBox.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Airport = { name: string; iata: string; city?: string; country?: string };
type EditorSnapshot = { value: string; cursor: number; labels: string[] };

function getCaretOffsetInTextarea(
  textarea: HTMLTextAreaElement,
  position: number,
) {
  const box = textarea.getBoundingClientRect();
  const style = window.getComputedStyle(textarea);

  const div = document.createElement("div");
  const span = document.createElement("span");

  div.style.position = "fixed";
  div.style.left = `${box.left}px`;
  div.style.top = `${box.top}px`;
  div.style.width = `${box.width}px`;
  div.style.height = `${box.height}px`;
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordWrap = "break-word";
  div.style.overflow = "auto";

  const propsToCopy = [
    "boxSizing",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "fontStyle",
    "fontVariant",
    "fontWeight",
    "fontStretch",
    "fontSize",
    "lineHeight",
    "fontFamily",
    "letterSpacing",
    "textTransform",
    "textIndent",
    "tabSize",
    "MozTabSize",
  ] as const;

  for (const p of propsToCopy) {
    // @ts-ignore
    div.style[p] = style[p];
  }

  const before = textarea.value.substring(0, position);
  const after = textarea.value.substring(position);

  div.textContent = before;
  span.textContent = after.length ? after[0] : ".";
  div.appendChild(span);

  document.body.appendChild(div);

  div.scrollTop = textarea.scrollTop;
  div.scrollLeft = textarea.scrollLeft;

  const rect = span.getBoundingClientRect();
  document.body.removeChild(div);

  const left = rect.left - box.left;
  const top = rect.top - box.top;

  const lineHeight = Number.parseFloat(style.lineHeight || "20") || 20;

  return { left, top, lineHeight };
}

function buildHighlightRanges(text: string, labels: string[]) {
  const ranges: Array<{ start: number; end: number }> = [];

  for (const label of labels) {
    if (!label) continue;
    let from = 0;
    while (from < text.length) {
      const idx = text.indexOf(label, from);
      if (idx === -1) break;
      ranges.push({ start: idx, end: idx + label.length });
      from = idx + label.length;
    }
  }

  ranges.sort((a, b) => a.start - b.start || b.end - a.end);

  const merged: Array<{ start: number; end: number }> = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (!last || r.start >= last.end) merged.push(r);
  }
  return merged;
}

function renderHighlighted(text: string, labels: string[]) {
  if (!text) return null;

  const ranges = buildHighlightRanges(text, labels);
  if (ranges.length === 0) return <>{text}</>;

  const nodes: React.ReactNode[] = [];
  let i = 0;

  for (const r of ranges) {
    if (i < r.start)
      nodes.push(<span key={`t-${i}`}>{text.slice(i, r.start)}</span>);

    const chunk = text.slice(r.start, r.end);
    nodes.push(
      <mark
        key={`m-${r.start}-${r.end}`}
        className="rounded-md bg-sky-200/65 ring-1 ring-sky-300/80 text-transparent"
      >
        {chunk}
      </mark>,
    );

    i = r.end;
  }

  if (i < text.length) nodes.push(<span key={`t-end`}>{text.slice(i)}</span>);

  return <>{nodes}</>;
}

function findMentionRangeForBackspace(
  text: string,
  cursor: number,
  labels: string[],
) {
  const ranges = buildHighlightRanges(text, labels);
  return ranges.find((r) => cursor > r.start && cursor <= r.end) ?? null;
}

function getMentionAtCursor(text: string, cursor: number) {
  const before = text.slice(0, cursor);
  const m = before.match(/@([a-zA-Z0-9 ]*)$/);
  if (!m) return null;

  const query = m[1] ?? "";
  const atStart = cursor - (query.length + 1);
  return { query, atStart };
}

function sameStringArray(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

export default function MentionBox() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const hiRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const historyRef = useRef<EditorSnapshot[]>([
    { value: "", cursor: 0, labels: [] },
  ]);
  const historyIndexRef = useRef(0);

  const [value, setValue] = useState("");
  const [cursor, setCursor] = useState(0);

  const [airports, setAirports] = useState<Airport[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const [pos, setPos] = useState({ left: 0, top: 0 });
  const [highlightLabels, setHighlightLabels] = useState<string[]>([]);

  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/mwgg/Airports/master/airports.json",
    )
      .then((r) => r.json())
      .then((data) => {
        const list: Airport[] = Object.values(data)
          .filter((a: any) => a && a.iata && a.name)
          .map((a: any) => ({
            name: a.name,
            iata: a.iata,
            city: a.city,
            country: a.country,
          }))
          .slice(0, 5000);

        setAirports(list);
      })
      .catch(() => setAirports([]));
  }, []);

  const mention = useMemo(() => {
    return getMentionAtCursor(value, cursor);
  }, [value, cursor]);

  const results = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.trim().toLowerCase();

    return airports
      .map((a) => {
        const hay =
          `${a.name} ${a.iata} ${a.city ?? ""} ${a.country ?? ""}`.toLowerCase();
        const idx = q ? hay.indexOf(q) : 0;
        return { a, idx };
      })
      .filter(({ idx }) => (q ? idx !== -1 : true))
      .sort((x, y) => x.idx - y.idx)
      .slice(0, 8)
      .map(({ a }) => a);
  }, [airports, mention]);

  useEffect(() => {
    if (!mention) {
      setOpen(false);
      setActiveIndex(0);
      return;
    }
    setOpen(true);
    setActiveIndex(0);
  }, [mention?.query]);

  useEffect(() => {
    if (!open) return;
    const el = itemRefs.current[activeIndex];
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open) return;
    const el = taRef.current;
    const root = rootRef.current;
    if (!el || !root) return;

    const { left, top, lineHeight } = getCaretOffsetInTextarea(el, cursor);
    const rootRect = root.getBoundingClientRect();
    const textareaRect = el.getBoundingClientRect();

    const offsetLeft = textareaRect.left - rootRect.left;
    const offsetTop = textareaRect.top - rootRect.top;

    const dropdownWidth = 320;
    const clampedLeft = Math.min(
      Math.max(0, left),
      Math.max(0, el.clientWidth - dropdownWidth - 8),
    );

    setPos({
      left: Math.max(0, offsetLeft + clampedLeft),
      top: Math.max(0, offsetTop + top + lineHeight + 10),
    });
  }, [cursor, value, open]);

  function syncCursor(el: HTMLTextAreaElement | null) {
    if (!el) return;
    setCursor(el.selectionStart ?? 0);
  }

  function getSyncedHighlightLabels(nextValue: string, existing: string[]) {
    return existing.filter((lbl) => nextValue.includes(lbl));
  }

  function pushHistory(snapshot: EditorSnapshot) {
    const history = historyRef.current;
    const at = historyIndexRef.current;
    const current = history[at];

    if (
      current &&
      current.value === snapshot.value &&
      current.cursor === snapshot.cursor &&
      sameStringArray(current.labels, snapshot.labels)
    ) {
      return;
    }

    const nextHistory = history.slice(0, at + 1);
    nextHistory.push({
      value: snapshot.value,
      cursor: snapshot.cursor,
      labels: [...snapshot.labels],
    });

    const maxEntries = 300;
    if (nextHistory.length > maxEntries) {
      nextHistory.splice(0, nextHistory.length - maxEntries);
    }

    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
  }

  function undoLastChange() {
    if (historyIndexRef.current === 0) return;

    historyIndexRef.current -= 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    if (!snapshot) return;

    setValue(snapshot.value);
    setHighlightLabels(snapshot.labels);
    setCursor(snapshot.cursor);
    setOpen(false);

    requestAnimationFrame(() => {
      const el = taRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(snapshot.cursor, snapshot.cursor);
    });
  }

  function insertAirport(a: Airport, cursorOverride?: number) {
    const liveCursor = cursorOverride ?? taRef.current?.selectionStart ?? cursor;
    const currentMention = getMentionAtCursor(value, liveCursor);
    if (!currentMention) return;

    const before = value.slice(0, currentMention.atStart);
    const after = value.slice(liveCursor);

    const label = `${a.name} (${a.iata})`;
    const next = before + label + after;
    const end = before.length + label.length;
    const nextLabels = highlightLabels.includes(label)
      ? highlightLabels
      : [...highlightLabels, label];

    setValue(next);
    setHighlightLabels(nextLabels);
    setCursor(end);
    setOpen(false);
    pushHistory({ value: next, cursor: end, labels: nextLabels });

    requestAnimationFrame(() => {
      const el = taRef.current;
      if (!el) return;

      el.focus();
      el.setSelectionRange(end, end);
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (
      (e.metaKey || e.ctrlKey) &&
      !e.altKey &&
      !e.shiftKey &&
      e.key.toLowerCase() === "z"
    ) {
      e.preventDefault();
      undoLastChange();
      return;
    }

    if (e.key === "Backspace") {
      const el = e.currentTarget;
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;

      if (start === end) {
        const mentionRange = findMentionRangeForBackspace(
          value,
          start,
          highlightLabels,
        );

        if (mentionRange) {
          e.preventDefault();
          const next =
            value.slice(0, mentionRange.start) + value.slice(mentionRange.end);
          const nextLabels = getSyncedHighlightLabels(next, highlightLabels);
          const nextCursor = mentionRange.start;

          setValue(next);
          setHighlightLabels(nextLabels);
          setCursor(nextCursor);
          setOpen(false);
          pushHistory({ value: next, cursor: nextCursor, labels: nextLabels });

          requestAnimationFrame(() => {
            const ta = taRef.current;
            if (!ta) return;
            ta.focus();
            ta.setSelectionRange(nextCursor, nextCursor);
          });
          return;
        }
      }
    }

    if (!open || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const liveCursor = e.currentTarget.selectionStart ?? cursor;
      insertAirport(results[activeIndex], liveCursor);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white/85 shadow-[0_26px_70px_-38px_rgba(15,23,42,0.65)] backdrop-blur-sm transition-colors duration-200">
        <div className="flex items-center justify-between border-b border-slate-200/70 bg-white/55 px-4 py-2.5 transition-colors duration-200">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 transition-colors duration-200">
            Message
          </span>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 transition-colors duration-200">
            <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 transition-colors duration-200">
              ↑↓
            </kbd>
            <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 transition-colors duration-200">
              Enter
            </kbd>
            <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 transition-colors duration-200">
              Tab
            </kbd>
          </div>
        </div>

        <div className="relative">
          <div
            ref={hiRef}
            aria-hidden="true"
            className="pointer-events-none h-52 overflow-auto whitespace-pre-wrap break-words px-4 py-3.5 text-[15px] leading-7 text-transparent"
          >
            {renderHighlighted(value, highlightLabels)}
            {"\n"}
          </div>

          <textarea
            ref={taRef}
            value={value}
            placeholder="Type @airport"
            onChange={(e) => {
              const next = e.target.value;
              const nextCursor = e.target.selectionStart ?? 0;
              const nextLabels = getSyncedHighlightLabels(
                next,
                highlightLabels,
              );

              setValue(next);
              setCursor(nextCursor);
              setHighlightLabels(nextLabels);
              pushHistory({
                value: next,
                cursor: nextCursor,
                labels: nextLabels,
              });
            }}
            onKeyDown={onKeyDown}
            onClick={(e) => syncCursor(e.currentTarget)}
            onKeyUp={(e) => syncCursor(e.currentTarget)}
            onScroll={(e) => {
              if (hiRef.current) {
                hiRef.current.scrollTop = e.currentTarget.scrollTop;
                hiRef.current.scrollLeft = e.currentTarget.scrollLeft;
              }
            }}
            className="absolute inset-0 h-52 w-full resize-none bg-transparent px-4 py-3.5 text-[15px] leading-7 text-slate-900 caret-sky-700 outline-none placeholder:text-slate-400 transition-colors duration-200"
          />
        </div>
      </div>

      {open && results.length > 0 && (
        <div
          className="mention-pop absolute z-20 w-80 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_30px_68px_-34px_rgba(15,23,42,0.55)] backdrop-blur transition-colors duration-200"
          style={{ left: pos.left, top: pos.top }}
        >
          <ul className="max-h-72 overflow-auto py-1">
            {results.map((a, i) => {
              const active = i === activeIndex;
              return (
                <li
                  key={`${a.iata}-${a.name}`}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                >
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertAirport(a)}
                    className={[
                      "w-full px-3.5 py-3 text-left transition-colors duration-150",
                      active
                        ? "bg-sky-50/90"
                        : "bg-white",
                      "hover:bg-slate-50 focus:outline-none",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-[15px] font-semibold leading-5 text-slate-900 transition-colors duration-200">
                        {a.name}
                      </span>
                      <span className="mt-0.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 transition-colors duration-200">
                        {a.iata}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500 transition-colors duration-200">
                      {[a.city, a.country].filter(Boolean).join(", ")}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

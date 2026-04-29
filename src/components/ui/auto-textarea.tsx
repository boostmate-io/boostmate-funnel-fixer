// =============================================================================
// AutoTextarea — a textarea that grows in height with its content and
// preserves bullet markers when text is pasted.
//
// • `minRows` controls the initial visible lines (default 3).
// • Bullets like •, ●, ▪, ◦, –, — at the start of a line are normalized to
//   "- " so the visual structure is preserved when pasting from docs/PDFs.
// • If pasted clipboard contains HTML with <li>/<ul>/<ol>, we extract list
//   items into "- " markdown so bullets survive even when the plain-text
//   variant from the source has them stripped (common in Google Docs / Notion).
// =============================================================================

import * as React from "react";
import { cn } from "@/lib/utils";

export interface AutoTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  /** When false, do not normalize bullets on paste. Default true. */
  preserveBullets?: boolean;
}

// Note: NO global flag here — `.test()` with /g is stateful and would skip
// matches on alternating calls. We use replaceAll-style multiline matching.
const BULLET_LINE = /^([\t ]*)[•●▪◦∙·▶►■□◆◇\-–—*]\s+/;

const normalizeBulletsText = (raw: string): string => {
  return raw
    .split(/\r?\n/)
    .map((line) => line.replace(BULLET_LINE, (_m, lead) => `${lead}- `))
    .join("\n");
};

const hasBulletLike = (raw: string): boolean =>
  raw.split(/\r?\n/).some((l) => BULLET_LINE.test(l));

/** Extract list items from pasted HTML (Google Docs, Notion, Word, etc.). */
const extractFromHtml = (html: string): string | null => {
  if (!/<li[\s>]/i.test(html)) return null;
  if (typeof window === "undefined") return null;
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const out: string[] = [];

    const walk = (node: Node, depth: number) => {
      node.childNodes.forEach((child) => {
        if (child.nodeType !== 1) return;
        const el = child as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (tag === "ul" || tag === "ol") {
          el.childNodes.forEach((li) => {
            if (li.nodeType !== 1) return;
            const liEl = li as HTMLElement;
            if (liEl.tagName.toLowerCase() !== "li") return;
            // capture this li's direct text (strip nested lists)
            const clone = liEl.cloneNode(true) as HTMLElement;
            clone.querySelectorAll("ul, ol").forEach((n) => n.remove());
            const text = (clone.textContent ?? "").trim().replace(/\s+/g, " ");
            if (text) out.push(`${"  ".repeat(depth)}- ${text}`);
            walk(liEl, depth + 1);
          });
        } else if (tag === "p" || tag === "div" || tag === "br") {
          const text = (el.textContent ?? "").trim();
          if (text && !/<li[\s>]/i.test(el.innerHTML)) {
            out.push(text);
          }
          if (/<(ul|ol)[\s>]/i.test(el.innerHTML)) walk(el, depth);
        } else {
          walk(el, depth);
        }
      });
    };
    walk(doc.body, 0);

    const joined = out.join("\n").trim();
    return joined.length > 0 ? joined : null;
  } catch {
    return null;
  }
};

const AutoTextarea = React.forwardRef<HTMLTextAreaElement, AutoTextareaProps>(
  (
    {
      className,
      minRows = 3,
      preserveBullets = true,
      onChange,
      onPaste,
      value,
      defaultValue,
      ...props
    },
    forwardedRef,
  ) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    const setRefs = (el: HTMLTextAreaElement | null) => {
      innerRef.current = el;
      if (typeof forwardedRef === "function") forwardedRef(el);
      else if (forwardedRef)
        (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
    };

    const resize = React.useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }, []);

    React.useEffect(() => {
      resize();
    }, [resize, value]);

    React.useEffect(() => {
      resize();
    }, [resize]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e);
      requestAnimationFrame(resize);
    };

    const insertText = (el: HTMLTextAreaElement, text: string) => {
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const next = el.value.slice(0, start) + text + el.value.slice(end);
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      setter?.call(el, next);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      const cursor = start + text.length;
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = cursor;
        resize();
      });
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (!preserveBullets) {
        onPaste?.(e);
        return;
      }
      const html = e.clipboardData?.getData("text/html") ?? "";
      const text = e.clipboardData?.getData("text") ?? "";

      // Prefer HTML extraction when the source provides a list structure
      const fromHtml = html ? extractFromHtml(html) : null;
      if (fromHtml) {
        e.preventDefault();
        insertText(e.currentTarget, fromHtml);
        return;
      }

      if (text && hasBulletLike(text)) {
        e.preventDefault();
        insertText(e.currentTarget, normalizeBulletsText(text));
        return;
      }

      onPaste?.(e);
    };

    return (
      <textarea
        ref={setRefs}
        rows={minRows}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        onPaste={handlePaste}
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-hidden",
          className,
        )}
        {...props}
      />
    );
  },
);
AutoTextarea.displayName = "AutoTextarea";

export { AutoTextarea };

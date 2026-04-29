// =============================================================================
// AutoTextarea — a textarea that grows in height with its content and
// preserves bullet markers when text is pasted.
//
// • `minRows` controls the initial visible lines (default 3).
// • Bullets like •, ●, ▪, ◦, –, — at the start of a line are normalized to
//   "- " so the visual structure is preserved when pasting from docs/PDFs.
// =============================================================================

import * as React from "react";
import { cn } from "@/lib/utils";

export interface AutoTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  /** When false, do not normalize bullets on paste. Default true. */
  preserveBullets?: boolean;
}

const BULLET_REGEX = /^[\t ]*[•●▪◦∙·▶►■□◆◇\-–—*]\s+/gm;

const normalizeBullets = (raw: string) => {
  // Replace any bullet-like character at start of a line with a "- " marker.
  return raw.replace(BULLET_REGEX, (m) => {
    // Preserve leading whitespace
    const lead = m.match(/^[\t ]*/)?.[0] ?? "";
    return `${lead}- `;
  });
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
      // Initial measurement after mount
      resize();
    }, [resize]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e);
      // Resize on next frame so React commits value first
      requestAnimationFrame(resize);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (preserveBullets) {
        const clipboard = e.clipboardData?.getData("text");
        if (clipboard && BULLET_REGEX.test(clipboard)) {
          e.preventDefault();
          const normalized = normalizeBullets(clipboard);
          const el = e.currentTarget;
          const start = el.selectionStart ?? el.value.length;
          const end = el.selectionEnd ?? el.value.length;
          const next = el.value.slice(0, start) + normalized + el.value.slice(end);
          // Use the native setter so React picks the change up
          const setter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            "value",
          )?.set;
          setter?.call(el, next);
          el.dispatchEvent(new Event("input", { bubbles: true }));
          // Restore cursor after pasted content
          const cursor = start + normalized.length;
          requestAnimationFrame(() => {
            el.selectionStart = el.selectionEnd = cursor;
            resize();
          });
          return;
        }
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

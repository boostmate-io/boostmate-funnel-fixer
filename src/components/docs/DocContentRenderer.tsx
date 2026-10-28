import type { ReactNode } from "react";
import { extractHeadings, safeHref, type DocNode } from "@/lib/docs/docContent";
import PromptCard from "./PromptCard";

/**
 * Renders stored Tiptap JSON as React elements. Never injects HTML, so lesson content
 * cannot execute scripts; unknown node types are ignored.
 */
const DocContentRenderer = ({ doc }: { doc: DocNode }) => {
  const ids = extractHeadings(doc).map((h) => h.id);
  let hi = 0;

  const renderText = (n: DocNode, key: number): ReactNode => {
    let el: ReactNode = n.text;
    for (const m of n.marks ?? []) {
      if (m.type === "bold") el = <strong className="font-semibold text-foreground">{el}</strong>;
      else if (m.type === "italic") el = <em>{el}</em>;
      else if (m.type === "underline") el = <u>{el}</u>;
      else if (m.type === "strike") el = <s>{el}</s>;
      else if (m.type === "code") el = <code className="rounded bg-muted px-1.5 py-0.5 text-[0.9em]">{el}</code>;
      else if (m.type === "link") {
        const href = safeHref(m.attrs?.href);
        if (href) {
          const external = /^https?:/i.test(href);
          el = (
            <a href={href} className="text-primary underline underline-offset-2 hover:opacity-80"
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{el}</a>
          );
        }
      }
    }
    return <span key={key}>{el}</span>;
  };

  const kids = (n: DocNode) => (n.content ?? []).map((c, i) => render(c, i));

  const render = (n: DocNode, key: number): ReactNode => {
    switch (n.type) {
      case "doc": return <>{kids(n)}</>;
      case "text": return renderText(n, key);
      case "paragraph": return <p key={key} className="my-4 leading-7 text-foreground/85">{kids(n)}</p>;
      case "hardBreak": return <br key={key} />;
      case "heading": {
        const level = Number(n.attrs?.level ?? 2);
        const id = ids[hi++];
        const cls = "scroll-mt-24 font-display font-bold text-foreground";
        if (level === 1) return <h2 key={key} id={id} className={`${cls} text-2xl sm:text-3xl mt-12 mb-4 pt-2 border-t first:border-t-0 first:mt-0`}>{kids(n)}</h2>;
        if (level === 2) return <h3 key={key} id={id} className={`${cls} text-xl mt-10 mb-3`}>{kids(n)}</h3>;
        return <h4 key={key} id={id} className={`${cls} text-lg mt-8 mb-2`}>{kids(n)}</h4>;
      }
      case "bulletList": return <ul key={key} className="my-4 ml-6 list-disc space-y-1.5 text-foreground/85 marker:text-muted-foreground">{kids(n)}</ul>;
      case "orderedList": return <ol key={key} start={Number(n.attrs?.start ?? 1)} className="my-4 ml-6 list-decimal space-y-1.5 text-foreground/85 marker:text-muted-foreground">{kids(n)}</ol>;
      case "listItem": return <li key={key} className="pl-1 [&>p]:my-1">{kids(n)}</li>;
      case "blockquote": return <blockquote key={key} className="my-6 border-l-4 border-primary/40 pl-4 italic text-muted-foreground">{kids(n)}</blockquote>;
      case "horizontalRule": return <hr key={key} className="my-10 border-border" />;
      case "aiPrompt": return <PromptCard key={key} title={String(n.attrs?.title ?? "")} prompt={String(n.attrs?.prompt ?? "")} content={n.attrs?.promptContent as DocNode | null | undefined} />;
      default: return null;
    }
  };

  return <div className="text-base">{render(doc, 0)}</div>;
};

export default DocContentRenderer;

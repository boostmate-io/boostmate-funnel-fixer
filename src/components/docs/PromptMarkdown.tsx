import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Render Markdown as safe React elements; never interpret embedded HTML. */
const PromptMarkdown = ({ source }: { source: string }) => (
  <div className="prose prose-sm dark:prose-invert max-w-none text-foreground break-words select-text [&_p]:whitespace-pre-wrap [&_a]:text-primary [&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto">
    <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{source}</ReactMarkdown>
  </div>
);

export default PromptMarkdown;
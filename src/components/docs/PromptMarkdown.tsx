import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Render Markdown as safe React elements; never interpret embedded HTML. */
const PromptMarkdown = ({ source }: { source: string }) => (
  <div className="text-sm leading-relaxed text-foreground break-words select-text space-y-4 [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_h4]:text-base [&_h5]:text-sm [&_h6]:text-sm [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-semibold [&_h4]:font-semibold [&_h5]:font-semibold [&_h6]:font-semibold [&_p]:whitespace-pre-wrap [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_li]:my-1 [&_li>p]:my-1 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:font-mono [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:overflow-x-auto [&_hr]:border-border [&_table]:block [&_table]:overflow-x-auto [&_th]:border [&_th]:border-border [&_th]:p-2 [&_td]:border [&_td]:border-border [&_td]:p-2 [&_img]:max-w-full">
    <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{source}</ReactMarkdown>
  </div>
);

export default PromptMarkdown;
import StarterKit from "@tiptap/starter-kit";

/** Shared schema for lesson and prompt editors and prompt conversion. */
export const documentationStarterKit = () => StarterKit.configure({
  heading: { levels: [1, 2, 3] },
  codeBlock: false,
  link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"] },
});
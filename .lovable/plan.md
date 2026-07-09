## Scope

Ship the generic infrastructure only. Meta Ad framework/component/AI action will be configured by the user in the admin UI afterward.

## 1. Storage: `copy-assets` bucket

- New private bucket `copy-assets` via `supabase--storage_create_bucket`.
- RLS on `storage.objects` (migration):
  - Path convention: `{sub_account_id}/{copy_document_id}/{uuid}-{filename}`.
  - `SELECT` / `INSERT` / `UPDATE` / `DELETE` for authenticated when the first path segment is a sub_account the user is a member of (`is_sub_account_member(auth.uid(), (storage.foldername(name))[1]::uuid)`).
  - `SELECT` for `anon` when the parent `copy_documents.funnel_id` belongs to a funnel with `is_public = true` and a matching share_token — implemented via a security-definer helper `public.copy_document_is_public(_doc_id uuid)` to keep the policy simple. Needed so shared funnel/analytics views can render thumbnails.

## 2. Generic `image` output field type

- `copy_components.output_structure` already stores an untyped `{key,label,type,...}` array — no schema change. Add `"image"` as a supported `type` value.
- `AdminCopyComponents` output-structure editor: add `image` to the type dropdown, with an optional `is_primary: boolean` flag (used later by thumbnail logic; only one field per component should be marked primary — validated client-side).
- `ComponentUIRenderer` / `GenericComponentUI`: render `type: "image"` fields as an upload widget:
  - Upload button → `supabase.storage.from("copy-assets").upload(path, file)`.
  - Store `{ path, url }` in `copy_document_components.outputs[key]` (path is the storage key; url is a signed URL refreshed on load).
  - Show thumbnail preview + "Replace" / "Remove" actions.
  - Non-generative: no LLM call for these fields.
- Edge function `execute-ai-action`: when building the tool schema from `output_structure`, filter out any field whose `type === "image"`. The LLM never sees or produces them.

## 3. Funnel node: 1:N linked documents

- **Node data**: keep `copyFrameworkId` as the *default* framework for new documents on that node. Remove reads of `copyDocumentId` (already unused by save flow after previous cleanup; strip on next save).
- **`NodeDetailsPanel`** replaces current single-doc block with a **grid** of `LinkedDocumentCard`s (see §4) plus a "New document" button:
  - Query: `copy_documents.select("*").eq("funnel_node_id", node.id)` scoped to sub_account.
  - "New document" uses the node's `copyFrameworkId` as default; user can change framework in the dialog before creation.
  - Card menu: Open, Change framework link, Detach (`funnel_node_id = null`), Delete.
- **`FunnelNode` thumbnail**: keep framework component-name list; append small badge with linked doc count when > 0.

## 4. `LinkedDocumentCard` + `LinkedDocumentsGrid` (shared component)

New reusable components under `src/components/copy/linked/`:

- `LinkedDocumentsGrid` — props: `documents`, `frameworkById`, `readOnly`, `onOpen`, `onCreate?`, `onDetach?`, `onDelete?`. Renders responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`).
- `LinkedDocumentCard` — Notion/Docs-style card:
  - Thumbnail area (aspect-video): resolved via generic `resolveDocumentThumbnail(doc, componentDefs)` helper.
  - Below: title, framework/type label, status pill (if `copy_documents.status` exists — add nullable column in migration), last-updated relative time.
  - Read-only mode hides mutation actions.

**Generic thumbnail resolver** (`src/lib/copy/documentThumbnail.ts`):

1. Load the doc's `copy_document_components` rows + their component defs.
2. For each component (in `sort_order`), scan `output_structure` for `type: "image"` fields.
3. Prefer a field with `is_primary: true`; otherwise take the first image field with a non-empty stored path.
4. Return a signed URL (cached in a `useSignedUrls` hook to batch).
5. Fallback: framework icon + gradient placeholder (framework `name` initials).

Used in:
- Funnel Designer `NodeDetailsPanel`
- `SharedFunnel` node inspector (read-only, `publicSupabase`, signed URLs from anon-accessible storage policy)
- Analytics node panel (same read-only grid, wired in `AnalyticsFunnelNode` / analytics detail)

## 5. Data model tweaks (single migration)

- `ALTER TABLE public.copy_documents ADD COLUMN status text` (nullable; freeform for now — "draft", "ready", "shipped" used by UI, not enforced).
- Security-definer helper `public.copy_document_is_public(_doc_id uuid)`.
- Storage RLS policies as in §1.
- No changes to `copy_document_components`, `copy_frameworks`, or node schema.

## 6. Deferred to admin UI (user does after ship)

- AI Action `generate_meta_ad`
- Copy Component `meta_ad` with output_structure including one `image` field marked `is_primary: true` (`creative`)
- Copy Framework "Meta Ad Copy" (type `meta_ad`) referencing `meta_ad` slug
- Add `meta_ad` to `DOCUMENT_TYPES` in `CopyDocumentsModule.tsx` — *this one line* will be the only follow-up code change after admin config, and can ship in the same PR as a placeholder tab.

## Implementation order

1. Migration + storage bucket + policies.
2. Generic `image` field type: admin editor, renderer, edge function filter.
3. `LinkedDocumentsGrid` + `LinkedDocumentCard` + thumbnail resolver.
4. Wire grid into `NodeDetailsPanel` (replace list) + strip legacy `copyDocumentId` reads.
5. Wire grid into `SharedFunnel` and Analytics node panel (read-only).
6. Verify with typecheck + a manual flow: create framework in admin, add image field, upload creative, confirm thumbnail renders in all three surfaces.

## Out of scope

- Meta Ads framework/component/AI action content.
- Repeatable-component-instance model (not needed under 1-doc-per-ad approach).
- Migrating any existing user data — the previous cleanup already removed `copySections`/`linkedAssetId`.
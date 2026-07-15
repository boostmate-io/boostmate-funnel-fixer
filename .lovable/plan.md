
## Probleem

Assistant-berichten bevatten ruwe tool-call syntax als zichtbare tekst:

```
[propose_blueprint_writes] reasoning: "..."
  path: "offer_stack.pricing.payment_plans.0.amount"
  label: "Payment Plan 1 — Amount"
  value: "£149"
  ...
[suggest_quick_replies] replies: ["Looks good...", ...]
```

De gebruiker ziet interne paths en tool-namen. De update-card wordt niet gerenderd omdat het geen echte tool-call is — het is tekst die eruitziet als een tool-call.

## Oorzaak

`supabase/functions/coach-chat/index.ts` regel 1110-1132 (`serializeAssistantForModel`) zet eerdere tool-outputs uit `parts` om naar tekst voor de model-context:

- `blueprint_writes` → `[proposed blueprint writes]\n  - <path>: <value>`
- `quick_replies` → `[suggested quick replies] A | B | C`
- `proposal` → `[proposed field value] <value>`
- `memory_saved` → `[remembered fact] <k>: <v>`

Deze bracketed pseudo-syntax is voor het model niet duidelijk onderscheidbaar van "een format dat ik zelf moet produceren". Zodra het model onder druk staat (lange context, veel writes tegelijk, tab-vraag) valt het terug op tekst-imitatie in plaats van échte tool-calls.

## Oplossing

Drie lagen — samen, niet apart:

### 1. Serialisatie neutraliseren
Vervang de tekst-representaties in `serializeAssistantForModel` door korte, niet-imiteerbare samenvattingen die géén syntactisch format bevatten:

- `blueprint_writes` → `(Previously proposed Blueprint updates for: <path1>, <path2>, ...)` — alleen padnamen, geen values, geen bullets, geen brackets die op tool-syntax lijken.
- `quick_replies` → volledig weglaten. Het model heeft z'n eigen eerdere suggesties niet nodig voor context.
- `proposal` → `(Previously proposed field value.)` zonder de value zelf (die zit al in de UI-state, model hoeft niet te herhalen).
- `memory_saved` → `(Remembered: <key>)` zonder de value.

### 2. Text sanitizer + recovery bij response-verwerking
In de response handler (waar assistant parts worden opgebouwd, rond regel 1360-1380):

- Detecteer in de assistant text-output regel-patronen die op onze eigen brackets lijken: `/^\s*\[(propose_blueprint_writes|suggest_quick_replies|proposed blueprint writes|suggested quick replies|proposed field value|remembered fact)\b/mi` en ook `/^\s*path:\s*"[^"]+"\s*$/mi`, `/^\s*(label|value|reasoning|replies):/mi`.
- **Recovery**: probeer eerst het blok te parsen naar een echte part:
  - `[propose_blueprint_writes]` blok → parse `path: "..."`, `label: "..."`, `value: "..."` triplets naar `{ type: "blueprint_writes", writes: [...] }`.
  - `[suggest_quick_replies] replies: [...]` → parse JSON-array of pipe-lijst naar `{ type: "quick_replies", replies: [...] }`.
- **Strip**: wat na parsing overblijft (of niet parsebaar is) uit de zichtbare text verwijderen. Als text daardoor leeg wordt, drop de text-part.

Dat maakt bestaande foute output nog nuttig én onzichtbaar voor de user.

### 3. System prompt regel toevoegen
Eén expliciete regel in de system prompt (bij de andere anti-imitatie regels rond regel 96-108):

> "NEVER write tool calls or their arguments as text. Do not output strings like `[propose_blueprint_writes]`, `[suggest_quick_replies]`, `path:`, `reasoning:`, or pipe-separated reply lists in your message content. Blueprint writes and quick replies exist ONLY as actual tool calls; if you want to propose them, invoke the tool — do not describe it."

## Verificatie

Playwright tegen preview:
1. Open Blueprint → Offer Design → Pricing tab. Open Coach.
2. Vraag: "the pricing tab seems pretty empty, fill it in"
3. Verwacht:
   - Geen `path:` / `[propose_blueprint_writes]` / `[suggest_quick_replies]` tekst in het bericht.
   - Wel een echte update-card met de voorgestelde writes.
   - Wel echte klikbare quick-reply knoppen (of geen quick replies — beide is oké, alleen niet als tekst).
4. Herhaal met de Angle en Stack tab om te bevestigen dat de fix breed werkt, niet alleen voor Pricing.
5. Reload de conversatie: oude berichten die de foute string al bevatten worden client-side niet gerenderd als tekst (zie stap 2 sanitizer, die draait server-side bij verzenden — voor reeds opgeslagen assistant text-parts is ook een lichte client-side strip in `CoachPanel.tsx` nodig zodat historische berichten schoon tonen).

## Wat blijft ongewijzigd

- `propose_blueprint_writes` en `suggest_quick_replies` tool signatures.
- Frontend rendering van `blueprint_writes` / `quick_replies` parts in `CoachPanel.tsx` (behalve één light text-strip regex voor legacy content).
- Walkthrough state-logica.
- Alle Blueprint schema paths.

## Bestanden

- `supabase/functions/coach-chat/index.ts` — serialisatie neutraliseren (~10 regels), text sanitizer + recovery in response handler (~40 regels), system prompt regel (~3 regels).
- `src/components/coach/CoachPanel.tsx` — client-side strip regex voor legacy assistant text (~5 regels), zodat al opgeslagen berichten ook schoon renderen.

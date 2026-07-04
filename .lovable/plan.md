## Doel

De AI Coach mag binnen dezelfde conversatie geen Blueprint-updates meer voorstellen voor velden die de gebruiker al **geaccepteerd** of **afgewezen** heeft. Nu weet noch de server, noch de UI dat een eerder voorstel al is afgehandeld — na een refresh of nieuwe vraag duiken dezelfde 37 items opnieuw op.

## Wat er verandert

1. **Beslissingen worden persistent bewaard** per conversatie (accepted / dismissed per veld).
2. **De Coach krijgt die lijst mee** bij elke turn en mag die paden niet opnieuw voorstellen.
3. **De server filtert** als vangnet: elk voorstel met een pad dat al is afgehandeld wordt stilzwijgend verwijderd voor het naar de UI gaat.
4. **De UI herstelt de status** van eerdere voorstellen na een refresh (Applied / Dismissed badges blijven zichtbaar in plaats van weer als "pending" te verschijnen).

## Gedragsregels

- Filtering geldt **alleen binnen dezelfde conversatie**. Een nieuwe conversatie (of een andere tab / doel) is een schone lei.
- Als de gebruiker expliciet vraagt "opnieuw voorstellen voor veld X" (herformuleerd), telt dat als een nieuwe intentie: dit lost zichzelf op omdat we sowieso alleen filteren bij overeenkomend pad; de coach kan gewoon een ander voorstel maken zolang de gebruiker duidelijk om een herziening vraagt. Voor v1 houden we het simpel: eenmaal afgehandeld = niet meer opnieuw voorstellen. Als dit knelt kunnen we later een "Voorstel opnieuw" knop toevoegen.
- List-secties (Framework Pillars, Deliverables, Testimonials, …) en Offer Ecosystem gebruiken virtuele `new_<n>` paden die per turn nieuw zijn — daar filteren we **niet** op pad, want elke nieuwe suggestie is uniek. Deze worden gewoon als losse inserts behandeld.

## Technisch plan

### 1. Nieuwe tabel `ai_coach_proposal_decisions`

```
id uuid pk
conversation_id uuid -> ai_coach_conversations(id) on delete cascade
message_id uuid null       -- zodat we bij reload de knop-status per bericht herstellen
sub_account_id uuid
user_id uuid
path text                   -- Blueprint dot-path
decision text check (decision in ('applied','dismissed'))
created_at timestamptz default now()
unique (conversation_id, path)   -- één eindstatus per pad per conversatie
```

Met RLS (`user_id = auth.uid()`) + GRANTs op `authenticated` en `service_role` (zoals de andere coach-tabellen).

### 2. Client — `CoachPanel.tsx` + `useCoachChat.ts`

- Bij Apply / Dismiss (per item én bulk) een row schrijven in `ai_coach_proposal_decisions`. Ecosystem- en list-section-paden (`…new_<n>…`) sláán we niet op — die kunnen niet botsen.
- `useCoachChat` laadt bij openen de decisions van de huidige conversatie en geeft ze mee aan `BlueprintWritesCard` per `message_id`, zodat pending → applied/dismissed correct wordt gerenderd na refresh.
- Bij `sendMessage` de lijst afgehandelde `path`s meesturen in de request body (of alleen op de server ophalen — zie punt 3).

### 3. Edge function `coach-chat`

- Aan het begin van de handler: `select path, decision from ai_coach_proposal_decisions where conversation_id = :id` → `handledPaths: Set<string>`.
- `buildSystemPrompt`: extra sectie **"# Already handled in this conversation"** met de paden die applied/dismissed zijn, met instructie: *"Do NOT include any of these paths in `propose_blueprint_writes` unless the user explicitly asks to redo them."*
- `sanitizeBlueprintWrites`: filter elk voorstel waarvan `handledPaths.has(path)`, tenzij het een virtuele list/ecosystem-pad is (`…new_\d+…`).

### 4. Samenspel met de vorige fix

De vorige fix (writes-tool alleen aanbieden bij schrijf-intentie) blijft van kracht. Deze laag komt erbovenop en dekt het geval waarin de gebruiker wél een schrijf-intentie uit maar de coach anders opnieuw dezelfde velden zou voorstellen.

## Bestanden

- `supabase/migrations/<new>.sql` — tabel + RLS + grants
- `supabase/functions/coach-chat/index.ts` — decisions laden, prompt-sectie, filter in `sanitizeBlueprintWrites`
- `src/lib/coach/useCoachChat.ts` — decisions laden per conversatie, doorgeven
- `src/components/coach/CoachPanel.tsx` — initial state uit gehydrateerde decisions, insert bij Apply/Dismiss
- `src/integrations/supabase/types.ts` — regenereert automatisch na migratie

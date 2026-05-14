# Plan: Unsaved Changes Warning + Sequence Group Container

## 1. Waarschuwing voor niet-opgeslagen wijzigingen

### Gedrag
- Bij het verlaten van de Funnel Designer (terug naar lijst, module-wissel, workspace-wissel, sluiten van tab) wordt eerst gecontroleerd of er onopgeslagen wijzigingen zijn.
- Als er wijzigingen zijn → modal met 3 knoppen:
  - **Save** — slaat huidige funnel op en gaat dan door met de navigatie
  - **Discard** — gooit wijzigingen weg en gaat door
  - **Cancel** — sluit modal, blijft in designer
- Voor browser-refresh / tab-sluiten: native `beforeunload` listener met standaard browser-prompt.

### Implementatie (`FunnelDesigner.tsx`)
- Nieuwe state `isDirty` (boolean) + ref naar laatst-opgeslagen snapshot van `nodes` + `edges` + `funnelName`.
- Vergelijking via JSON-stringify in een `useEffect` die luistert op nodes/edges/name → zet `isDirty`.
- Reset `isDirty = false` na succesvolle save en na initial load van een funnel.
- `useEffect` met `beforeunload` listener wanneer `isDirty`.
- Nieuwe `pendingNavigation` state + `AlertDialog` (shadcn) met Save / Discard / Cancel.
- Wrap alle exit-paden (`onBackToList`, eventuele andere navigatie-callbacks vanuit de toolbar) in een `requestExit(callback)` helper die de dialog opent als `isDirty`, anders direct uitvoert.

### Beperking
- Module-wissel en workspace-switch gebeuren buiten `FunnelDesigner` (in sidebar/context). Voor die paden voegen we een lichtgewicht "exit guard" toe via een ref op `window` (bijv. `window.__funnelDesignerDirtyGuard`) die de sidebar/WorkspaceContext kan aanroepen vóór ze daadwerkelijk wisselen. Alternatief: `isDirty` in een nieuwe context publiceren en sidebar laat deze checken. We kiezen voor de window-ref aanpak (klein, geïsoleerd, geen grote refactor).

## 2. Sequence Group Container (lasso-select → group)

### Concept
- Selecteer meerdere nodes (lasso of shift-click — React Flow heeft beide ingebouwd).
- Knop **"Group as sequence"** in de toolbar (alleen actief als ≥2 nodes geselecteerd).
- Dit maakt een nieuwe **group node** (React Flow native `type: "group"` met onze custom render) die de geselecteerde nodes als children krijgt.
- Group node heeft:
  - **Naam** (bewerkbaar in details panel, getoond in header van de group)
  - **Notes** (optioneel veld in details panel)
  - **Collapse/expand toggle** rechtsbovenin de group
  - Wanneer ingeklapt: toont alleen header met naam + aantal nodes binnen de group ("Email sequence — 12 steps"), in compacte vorm. Edges van/naar nodes binnen de group worden tijdelijk omgeleid naar de group-node zelf zodat de canvas overzichtelijk blijft.
  - Wanneer uitgeklapt: toont alle children op hun originele relatieve posities binnen een licht-gekleurde container.
- **Ungroup** knop in details panel om de group op te lossen (children blijven, group-node verdwijnt).

### Data-model
- Group is gewoon een node in de bestaande `nodes` jsonb-array.
  - `type: "sequenceGroup"`
  - `data: { label, notes, collapsed: boolean, childIds: string[] }`
  - Child nodes krijgen `parentNode: groupId` en `extent: "parent"` (React Flow native).
- Bij collapse:
  - Children krijgen `hidden: true`
  - Edges met source/target binnen de group worden verborgen
  - Edges van buiten naar binnen worden tijdelijk geremapt naar de group-id (bewaard origineel in edge.data zodat ungroup/expand het kan herstellen)
- Bij expand: omgekeerd.
- Geen DB schema change nodig — alles past in bestaande jsonb kolommen.

### Nieuwe component
- `src/components/funnel-designer/SequenceGroupNode.tsx` — custom React Flow node die collapse/expand UI rendert + container styling.
- Registreren in `nodeTypes` in `FunnelDesigner.tsx`.

### Toolbar uitbreidingen
- "Group as sequence" knop verschijnt wanneer er ≥2 nodes geselecteerd zijn.
- Bestaande "selection" feature van React Flow gebruiken (`onSelectionChange`).

### NodeDetailsPanel uitbreiding
- Wanneer geselecteerde node `type === "sequenceGroup"`: toon naam + notes textarea + Ungroup knop.

## Bestanden

```text
src/components/funnel-designer/
├── FunnelDesigner.tsx          (dirty tracking + exit guard + group toolbar btn + node type registratie)
├── SequenceGroupNode.tsx       (NIEUW — collapsible container node)
├── NodeDetailsPanel.tsx        (sequence group fields)
└── constants.ts                (geen wijziging — geen Communication-elementen toegevoegd, want we kiezen lasso-aanpak)
```

## Waarom lasso-aanpak (jouw keuze) goed is t.o.v. start/end markers
- Geen risico op "vergeten end-marker" → je kan niet per ongeluk een onafgemaakte sequence krijgen.
- Werkt ook voor andere groeperingen later (niet alleen email — bijv. een upsell-flow of een welcome-serie).
- Cleaner canvas: één container i.p.v. twee losse marker-nodes.
- Standaard React Flow patroon (parent/child nodes), dus minder custom code.

## Open keuzes (kunnen tijdens build beslist worden)
- Standaardkleur van de sequence container (suggestie: subtiel `bg-primary/5` met `border-primary/20`).
- Collapsed-weergave breedte: vast (~280px) zodat de canvas-flow netjes blijft.

## Doel
In de "Blueprint updates (N)" kaart van de AI Coach: per veld kunnen **accepteren** en **weigeren**, naast de bestaande "Apply all".

## UX

Elk voorstel-item krijgt twee kleine knoppen rechtsboven:
- ✓ Apply (past enkel dit veld toe)
- ✕ Dismiss (verwijdert dit voorstel uit de kaart)

Onderaan blijven de globale acties, maar slimmer:
- **Apply all remaining** — past alle nog niet behandelde voorstellen toe
- **Dismiss all** — sluit de hele kaart weg

Per-item statussen visueel:
- *pending* — normale weergave met ✓/✕
- *applied* — grijs/doorstreept met "Applied" badge, knoppen weg
- *dismissed* — item verdwijnt uit de lijst (of collapsed met "Dismissed")

Als alle items applied/dismissed zijn → onderste knoppen disablen en toon "All handled".

### Praktisch nut van decline?
Ja, wel degelijk nuttig:
- Coach stelt soms 4 goede + 1 zwak voorstel voor → gebruiker wil de 4 accepteren zonder de zwakke te moeten overschrijven.
- "Dismiss" voorkomt dat de kaart blijft aandringen en houdt de chat opgeruimd.
- Individueel weigeren is duidelijker dan "gewoon niks doen" (er blijft anders visuele ruis staan).

## Technische aanpak (frontend-only)

Alle wijzigingen zitten in `src/components/coach/CoachPanel.tsx` in de `BlueprintWritesCard` component. Geen edge function of schema-wijzigingen nodig.

1. **Lokale state per item** in `BlueprintWritesCard`:
   ```ts
   type ItemState = "pending" | "applying" | "applied" | "dismissed";
   const [states, setStates] = useState<ItemState[]>(() => writes.map(() => "pending"));
   ```

2. **Per-item apply**: roept `onApplyAll` aan met een array van 1 write (bestaande `applyBlueprintWrites` in `src/lib/coach/applyBlueprintWrites.ts` accepteert al elk aantal). Zet state naar `applying` → `applied`.

3. **Per-item dismiss**: zet state naar `dismissed`, puur client-side.

4. **Apply all remaining**: filtert writes waarvan state `pending` is en stuurt die als batch.

5. **Rendering**:
   - Applied items: `opacity-60`, doorstreepte value, kleine "Applied" badge, geen knoppen.
   - Dismissed items: niet renderen (of optioneel een compacte "Dismissed — undo" regel; ik houd het simpel en verberg ze).
   - Pending items: huidige weergave + twee icon-buttons (Check / X) rechtsboven het item.

6. **Footer knop-tekst** past zich aan:
   - Als er nog pending items zijn: "Apply all remaining (K)"
   - Als alles behandeld is: knop weg, kleine tekst "All handled".

## Bestand dat wijzigt
- `src/components/coach/CoachPanel.tsx` — enkel de `BlueprintWritesCard` sectie.

## Buiten scope
- Geen wijziging aan `applyBlueprintWrites`, `coach-chat` edge function, of het schema.
- Geen persistentie van dismiss-status over sessies (kaart is per bericht in de chat; refresh laadt de chat opnieuw op — dan staan voorstellen weer als pending, wat OK is).

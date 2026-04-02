

# Agency Upgrade: Bestaand Account als Eerste Client

## Probleem
Bij upgrade van `personal` → `agency` blijft alle data (projecten, funnels, audits, assets) op het agency-account staan. Er wordt geen apart client-account aangemaakt.

## Oplossing
Bij de upgrade flow wordt automatisch een nieuw client-account aangemaakt dat de bestaande data overneemt, of — eenvoudiger — wordt het bestaande account conceptueel het eerste client-account van de agency.

### Aanpak: "Self-client" patroon
Wanneer een user upgradet naar agency:

1. **Behoud het huidige account als agency** (`account_type = 'agency'`)
2. **Maak een `agency_clients` record aan** waar `agency_user_id = client_user_id = auth.uid()` — een self-referentie die aangeeft dat de agency ook een eigen client-account heeft
3. **Alle bestaande data** (projecten, funnels, etc.) blijft gekoppeld aan dezelfde `user_id` en is toegankelijk via de self-client relatie
4. **Toekomstige nieuwe clients** worden aparte accounts

### Benodigde wijzigingen

**1. `AgencyContext.tsx` — `upgradeToAgency` functie**
- Na het updaten van `account_type` naar `agency`, een `agency_clients` record inserten met `agency_user_id = client_user_id = currentUserId`
- De display_name van het bestaande profiel gebruiken als eerste client-naam

**2. `ClientManagement.tsx` — UI aanpassing**
- De self-client herkennen en markeren als "My Account" of "Mijn bedrijf"
- Eventueel een andere styling geven dan externe clients

**3. `is_agency_of` security function**
- Werkt al correct: checkt `agency_user_id` en `client_user_id` in `agency_clients` — een self-referentie row past hier gewoon in

**4. Geen database migratie nodig**
- Het `agency_clients` tabel ondersteunt al de self-referentie (geen unique constraint die dit blokkeert)

### Files te wijzigen
- `src/contexts/AgencyContext.tsx` — upgrade functie uitbreiden
- `src/components/agency/ClientManagement.tsx` — self-client markering
- `src/components/agency/AgencySettings.tsx` — eventueel bevestigingsdialoog toevoegen


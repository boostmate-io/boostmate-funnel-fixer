# PRD: Authenticatie

## Overzicht
Gebruikersregistratie, login, sessie-beheer en e-mailverificatie via Lovable Cloud Auth.

## Doelstellingen
- Veilige gebruikersregistratie met e-mailverificatie
- Login/logout functionaliteit
- Sessie-beheer met automatische token refresh
- Rolgebaseerde toegang (admin/user) via `user_roles` tabel

## Functionele Vereisten

### FR-1: Registratie
- Gebruiker kan een account aanmaken met e-mail en wachtwoord
- E-mailverificatie is vereist voordat de gebruiker kan inloggen
- Na verificatie wordt automatisch een eerste project aangemaakt

### FR-2: Login
- Gebruiker kan inloggen met e-mail en wachtwoord
- Sessie wordt opgeslagen en automatisch hersteld bij herbezoek
- Bij verlopen sessie wordt de gebruiker uitgelogd

### FR-3: AuthModal
- Modal-gebaseerde UX (geen aparte pagina's)
- Wisselen tussen login- en registratiemodus
- Foutmeldingen bij ongeldige credentials

### FR-4: Rolbeheer
- Rollen worden opgeslagen in `user_roles` tabel (niet op profiel)
- `has_role()` security definer functie voor RLS policies
- Admin-rol geeft toegang tot Knowledge Center

## Database Schema

### Tabel: `user_roles`
| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK naar auth.users |
| role | app_role (enum) | 'admin' of 'user' |
| created_at | timestamptz | Aanmaakdatum |

## Technische Details
- Supabase Auth voor authenticatie
- RLS policies op alle tabellen met `auth.uid()`
- AuthModal component in `src/components/auth/AuthModal.tsx`

## Afhankelijkheden
- Lovable Cloud (Supabase Auth)

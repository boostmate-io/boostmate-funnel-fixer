# PRD: Internationalization (i18n)

## Overview
Support for Dutch and English via i18next with a language switcher in the dashboard sidebar.

## Objectives
- Full UI available in NL and EN
- Easy switching between languages
- Language preference is remembered

## Functional Requirements

### FR-1: Translations
- All UI texts via `t()` function from i18next
- Translation files: `src/i18n/en.json` and `src/i18n/nl.json`
- Fallback to English for missing translations

### FR-2: Language Switcher
- Component in the dashboard sidebar
- Visual indicator of the active language
- Instant language switch without page refresh

### FR-3: Language Persistence
- Selected language is stored in localStorage
- On revisit, the last chosen language is restored

## Technical Details
- `src/i18n/index.ts` — i18next configuration
- `src/i18n/en.json` — English translations
- `src/i18n/nl.json` — Dutch translations
- `src/components/dashboard/LanguageSwitcher.tsx` — Language switcher
- Uses `react-i18next` with `useTranslation` hook

## Dependencies
- None (standalone feature)

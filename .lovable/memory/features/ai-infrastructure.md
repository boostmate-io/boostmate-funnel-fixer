---
name: AI Infrastructure
description: Global AI Actions system with instruction blocks, admin CRUD, and execute edge function
type: feature
---
- AI Actions: centralized reusable AI logic stored in `ai_actions` table (name, slug, type, prompt_template, model_settings, input/output structure)
- Instruction Blocks: reusable prompt modules in `ai_instruction_blocks`, linked via `ai_action_instruction_blocks` junction table
- Admin UI: tabs "AI Actions" and "Instruction Blocks" in AdminPanel
- Edge function: `execute-ai-action` — accepts slug + inputs + extra_instructions, returns structured output via tool calling
- Client helper: `src/lib/api/aiActions.ts` — `executeAIAction()` and `getAvailableAIActions()`
- RLS: admins manage, all authenticated can read
- Any part of the app can call an AI Action by slug with `executeAIAction({ slug, inputs, extraInstructions })`

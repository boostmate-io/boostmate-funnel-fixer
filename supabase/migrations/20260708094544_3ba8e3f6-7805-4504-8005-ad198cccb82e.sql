UPDATE ai_instruction_blocks
SET content = content || E'\n\n- FORMATTING RULE: Section headlines must NEVER end with a period. Question marks and exclamation marks are allowed when appropriate.'
WHERE id IN (
  '54bc977e-91bb-455b-b17e-d3eaad062275',
  '2b9109ef-47d6-4dba-a986-64530dd4d288',
  '3c33d288-4179-466f-89af-b8293460f6b9',
  '653dd23f-1537-4481-b2d9-494694b2b947',
  '7c4c4842-4270-4043-ba00-c5e8709203a3'
);
create table public.public_offer_generations (
  id uuid primary key default gen_random_uuid(),
  claim_token uuid not null unique default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending','complete','failed')),
  input jsonb not null default '{}'::jsonb,
  result jsonb,
  ip_hash text not null,
  email text,
  marketing_consent boolean not null default false,
  consent_text_version text,
  consent_at timestamptz,
  unlocked_at timestamptz,
  claimed_by uuid,
  claimed_sub_account_id uuid,
  claimed_offer_id uuid,
  claimed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);
create index idx_pog_ip_created on public.public_offer_generations (ip_hash, created_at desc);
create index idx_pog_created on public.public_offer_generations (created_at desc);
alter table public.public_offer_generations enable row level security;
-- Server-only: no policies; browser roles get no access at all.
revoke all on public.public_offer_generations from anon, authenticated;
grant all on public.public_offer_generations to service_role;
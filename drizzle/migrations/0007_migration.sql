create table public.offer_blueprint_deliveries (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.public_offer_generations(id) on delete cascade,
  email_hash text not null,
  audit_requested boolean not null default false,
  ip_hash text,
  status text not null default 'pending' check (status in ('pending','sent','admin_failed')),
  created_at timestamptz not null default now(),
  unique (generation_id, email_hash)
);
alter table public.offer_blueprint_deliveries enable row level security;
grant all on public.offer_blueprint_deliveries to service_role;
create index offer_blueprint_deliveries_ip_idx on public.offer_blueprint_deliveries (ip_hash, created_at desc);
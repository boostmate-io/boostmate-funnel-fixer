create table public.offer_builder_sessions (
  id uuid primary key default gen_random_uuid(),
  sub_account_id uuid not null references public.sub_accounts(id) on delete cascade,
  user_id uuid not null,
  offer_id uuid references public.offers(id) on delete set null,
  tier text not null check (tier in ('free','low_ticket','mid_ticket','core','premium','continuity')),
  mode text not null check (mode in ('new','existing')),
  stage text not null default 'understand' check (stage in ('understand','diagnose','strengthen','package','final')),
  status text not null default 'active' check (status in ('active','completed','abandoned')),
  intake jsonb not null default '{}'::jsonb,
  understanding jsonb,
  context_confirmed_at timestamptz,
  diagnosis jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  decisions jsonb not null default '{}'::jsonb,
  draft_design jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_obs_workspace on public.offer_builder_sessions (sub_account_id, status, updated_at desc);
create index idx_obs_offer on public.offer_builder_sessions (offer_id) where offer_id is not null;

grant select, insert, update, delete on public.offer_builder_sessions to authenticated;
grant all on public.offer_builder_sessions to service_role;
alter table public.offer_builder_sessions enable row level security;

create policy "Builder sessions: members read"
  on public.offer_builder_sessions for select to authenticated
  using (user_id = auth.uid() and (public.is_sub_account_member(auth.uid(), sub_account_id) or public.is_app_admin(auth.uid())));
create policy "Builder sessions: members create own"
  on public.offer_builder_sessions for insert to authenticated
  with check (user_id = auth.uid() and (public.is_sub_account_member(auth.uid(), sub_account_id) or public.is_app_admin(auth.uid())));
create policy "Builder sessions: owner updates"
  on public.offer_builder_sessions for update to authenticated
  using (user_id = auth.uid() and (public.is_sub_account_member(auth.uid(), sub_account_id) or public.is_app_admin(auth.uid())))
  with check (user_id = auth.uid() and (public.is_sub_account_member(auth.uid(), sub_account_id) or public.is_app_admin(auth.uid())));
create policy "Builder sessions: owner deletes"
  on public.offer_builder_sessions for delete to authenticated
  using (user_id = auth.uid());

create trigger trg_offer_builder_sessions_updated
  before update on public.offer_builder_sessions
  for each row execute function public.update_updated_at_column();
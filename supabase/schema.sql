create or replace function public.my_workspace() returns text
language sql stable as $$
  select case
    when coalesce(auth.jwt()->>'email','') = ''
      or lower(split_part(auth.jwt()->>'email','@',2)) in ('gmail.com','yahoo.com','outlook.com','hotmail.com','icloud.com','live.com','proton.me','protonmail.com')
    then auth.uid()::text
    else lower(split_part(auth.jwt()->>'email','@',2))
  end
$$;

create table if not exists public.meetings (
  id text primary key,
  user_id uuid not null default auth.uid(),
  workspace text not null,
  owner_email text,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.gate_log (
  id text primary key,
  user_id uuid not null default auth.uid(),
  workspace text not null,
  owner_email text,
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.meetings enable row level security;
alter table public.gate_log enable row level security;

create policy "meetings_select" on public.meetings for select using (workspace = public.my_workspace());
create policy "meetings_insert" on public.meetings for insert with check (user_id = auth.uid() and workspace = public.my_workspace());
create policy "meetings_update" on public.meetings for update using (workspace = public.my_workspace()) with check (workspace = public.my_workspace());
create policy "meetings_delete" on public.meetings for delete using (user_id = auth.uid());

create policy "gate_select" on public.gate_log for select using (workspace = public.my_workspace());
create policy "gate_insert" on public.gate_log for insert with check (user_id = auth.uid() and workspace = public.my_workspace());
create policy "gate_delete" on public.gate_log for delete using (user_id = auth.uid());

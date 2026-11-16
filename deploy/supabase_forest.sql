-- ════════════════════════════════════════════════════════════════════════════
-- BIOGLOW Forest – Sync & Gruppen (selbst gehostetes Supabase: https://supabase.arndt-software.de)
-- Einmal im Supabase Studio → SQL Editor ausführen. Mehrfach ausführen schadet nicht (idempotent,
-- löscht keine Daten). Getestet mit checks/sql_check.sh (Postgres im Container, RLS-Szenarien).
--
-- Grundsatz: Nachweise sind signiert und UNVERÄNDERLICH – auch auf dem Server.
--   * Es gibt keine UPDATE-/DELETE-Regeln für forest_records; ein Trigger verbietet Änderungen zusätzlich.
--   * Der Server speichert und verteilt nur. Prüfen tut jedes Gerät selbst (öffentliche Schlüssel in forest_devices).
--   * uploaded_at setzt der Server (Eingangszeit) – ein vom Gerät unabhängiger Zeitpunkt.
-- Rollen je Gruppe: manager (verwaltet), member (erfasst), inspector (erfasst, interne Überwachung),
--                   auditor (liest nur).
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Tabellen ────────────────────────────────────────────────────────────────
create table if not exists public.forest_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(name) between 1 and 120),
  invite_code text unique not null default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.forest_members (
  group_id     uuid not null references public.forest_groups(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'member' check (role in ('manager', 'member', 'inspector', 'auditor')),
  display_name text check (display_name is null or length(display_name) <= 80),
  joined_at    timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists forest_members_user on public.forest_members(user_id);

-- Öffentliche Geräteschlüssel (zum Prüfen der Signaturen anderer Mitglieder)
create table if not exists public.forest_devices (
  key_id     text primary key check (key_id ~ '^[0-9a-f]{16}$'),
  user_id    uuid not null references auth.users(id) on delete cascade,
  public_jwk jsonb not null,
  created_at timestamptz not null default now()
);

-- Signierte Nachweise (der komplette Nachweis steckt unverändert in "record")
create table if not exists public.forest_records (
  id            uuid primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  group_id      uuid references public.forest_groups(id) on delete set null,
  device_key_id text not null references public.forest_devices(key_id),
  seq           integer not null check (seq > 0),
  kind          text not null,
  hash          text not null unique check (hash ~ '^[0-9a-f]{64}$'),
  prev_hash     text not null check (prev_hash ~ '^[0-9a-f]{64}$'),
  created_at    timestamptz not null,
  record        jsonb not null check (pg_column_size(record) < 500000),
  uploaded_at   timestamptz not null default now(),
  unique (device_key_id, seq)
);
create index if not exists forest_records_group on public.forest_records(group_id);
create index if not exists forest_records_user on public.forest_records(user_id);

-- Fotos: Datei im Storage-Bucket forest-media, hier nur Zuordnung + Hash
create table if not exists public.forest_media (
  id        uuid primary key,
  record_id uuid not null references public.forest_records(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  path      text not null unique,
  sha256    text not null check (sha256 ~ '^[0-9a-f]{64}$')
);
create index if not exists forest_media_record on public.forest_media(record_id);

-- ── Unveränderlichkeit ──────────────────────────────────────────────────────
-- Einzige erlaubte Änderung: group_id (Zuordnung zu einer Gruppe), nur durch den Eigentümer.
create or replace function public.forest_records_immutable() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if new.id <> old.id or new.user_id <> old.user_id or new.device_key_id <> old.device_key_id or new.seq <> old.seq
       or new.kind <> old.kind or new.hash <> old.hash or new.prev_hash <> old.prev_hash
       or new.created_at <> old.created_at or new.record <> old.record or new.uploaded_at <> old.uploaded_at then
      raise exception 'forest_records sind unveränderlich';
    end if;
    return new;
  end if;
  raise exception 'forest_records sind unveränderlich';
end $$;
drop trigger if exists forest_records_lock on public.forest_records;
create trigger forest_records_lock before update or delete on public.forest_records
  for each row when (pg_trigger_depth() = 0) execute function public.forest_records_immutable();

-- Server-Eingangszeit nicht vom Client überschreibbar; record muss zu den Spalten passen
create or replace function public.forest_records_check() returns trigger
language plpgsql set search_path = public as $$
begin
  new.uploaded_at := now();
  if (new.record->>'id')::uuid <> new.id or new.record->>'hash' <> new.hash or new.record->>'prevHash' <> new.prev_hash
     or new.record->>'deviceKeyId' <> new.device_key_id or (new.record->>'seq')::int <> new.seq
     or new.record->>'kind' <> new.kind then
    raise exception 'record passt nicht zu den Spalten';
  end if;
  if not exists (select 1 from public.forest_devices d where d.key_id = new.device_key_id and d.user_id = new.user_id) then
    raise exception 'Geräteschlüssel gehört nicht zu diesem Konto';
  end if;
  return new;
end $$;
drop trigger if exists forest_records_ins on public.forest_records;
create trigger forest_records_ins before insert on public.forest_records
  for each row execute function public.forest_records_check();

-- ── Hilfsfunktionen (SECURITY DEFINER → keine RLS-Rekursion) ────────────────
create or replace function public.forest_is_member(gid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.forest_members where group_id = gid and user_id = auth.uid());
$$;

create or replace function public.forest_role(gid uuid) returns text
language sql security definer stable set search_path = public as $$
  select role from public.forest_members where group_id = gid and user_id = auth.uid();
$$;

create or replace function public.forest_shares_group(other uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.forest_members a join public.forest_members b on a.group_id = b.group_id
                 where a.user_id = auth.uid() and b.user_id = other);
$$;

-- Gruppe anlegen → Ersteller wird manager. Gibt id + Einladungscode zurück.
create or replace function public.forest_create_group(group_name text, my_name text default null)
returns table (id uuid, invite_code text)
language plpgsql security definer set search_path = public as $$
declare g public.forest_groups;
begin
  if auth.uid() is null then raise exception 'nicht angemeldet'; end if;
  insert into public.forest_groups (name, created_by) values (group_name, auth.uid()) returning * into g;
  insert into public.forest_members (group_id, user_id, role, display_name) values (g.id, auth.uid(), 'manager', my_name);
  return query select g.id, g.invite_code;
end $$;

-- Beitritt per Einladungscode → Rolle member
create or replace function public.forest_join_group(code text, my_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  if auth.uid() is null then raise exception 'nicht angemeldet'; end if;
  select g.id into gid from public.forest_groups g where g.invite_code = upper(trim(code));
  if gid is null then raise exception 'Ungültiger Einladungscode'; end if;
  insert into public.forest_members (group_id, user_id, role, display_name) values (gid, auth.uid(), 'member', my_name)
    on conflict (group_id, user_id) do nothing;
  return gid;
end $$;

-- Rolle ändern – nur manager; der letzte manager kann sich nicht selbst herabstufen
create or replace function public.forest_set_role(gid uuid, member uuid, new_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.forest_role(gid) is distinct from 'manager' then raise exception 'nur manager'; end if;
  if new_role not in ('manager', 'member', 'inspector', 'auditor') then raise exception 'unbekannte Rolle'; end if;
  if member = auth.uid() and new_role <> 'manager'
     and (select count(*) from public.forest_members where group_id = gid and role = 'manager') = 1 then
    raise exception 'letzter manager';
  end if;
  update public.forest_members set role = new_role where group_id = gid and user_id = member;
end $$;

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.forest_groups  enable row level security;
alter table public.forest_members enable row level security;
alter table public.forest_devices enable row level security;
alter table public.forest_records enable row level security;
alter table public.forest_media   enable row level security;

drop policy if exists forest_groups_select on public.forest_groups;
create policy forest_groups_select on public.forest_groups for select to authenticated
  using (public.forest_is_member(id));
drop policy if exists forest_groups_update on public.forest_groups;
create policy forest_groups_update on public.forest_groups for update to authenticated
  using (public.forest_role(id) = 'manager') with check (public.forest_role(id) = 'manager');

drop policy if exists forest_members_select on public.forest_members;
create policy forest_members_select on public.forest_members for select to authenticated
  using (public.forest_is_member(group_id));
drop policy if exists forest_members_delete on public.forest_members;
create policy forest_members_delete on public.forest_members for delete to authenticated
  using (user_id = (select auth.uid()) or public.forest_role(group_id) = 'manager');

drop policy if exists forest_devices_select on public.forest_devices;
create policy forest_devices_select on public.forest_devices for select to authenticated
  using (user_id = (select auth.uid()) or public.forest_shares_group(user_id));
drop policy if exists forest_devices_insert on public.forest_devices;
create policy forest_devices_insert on public.forest_devices for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists forest_records_select on public.forest_records;
create policy forest_records_select on public.forest_records for select to authenticated
  using (user_id = (select auth.uid()) or (group_id is not null and public.forest_is_member(group_id)));
drop policy if exists forest_records_insert on public.forest_records;
create policy forest_records_insert on public.forest_records for insert to authenticated
  with check (user_id = (select auth.uid())
              and (group_id is null or public.forest_role(group_id) in ('manager', 'member', 'inspector')));
-- Zuordnung zu einer Gruppe nachträglich (nur Eigentümer, nur Gruppen mit Schreibrecht); Rest verbietet der Trigger
drop policy if exists forest_records_assign on public.forest_records;
create policy forest_records_assign on public.forest_records for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (group_id is null or public.forest_role(group_id) in ('manager', 'member', 'inspector')));

drop policy if exists forest_media_select on public.forest_media;
create policy forest_media_select on public.forest_media for select to authenticated
  using (exists (select 1 from public.forest_records r where r.id = record_id));
drop policy if exists forest_media_insert on public.forest_media;
create policy forest_media_insert on public.forest_media for insert to authenticated
  with check (user_id = (select auth.uid()) and split_part(path, '/', 1) = (select auth.uid())::text);

-- ── Storage: privater Bucket für Fotos, Pfad {user_id}/{media_id}.jpg ───────
insert into storage.buckets (id, name, public) values ('forest-media', 'forest-media', false)
  on conflict (id) do nothing;

drop policy if exists "forest-media insert own" on storage.objects;
create policy "forest-media insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'forest-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "forest-media read shared" on storage.objects;
create policy "forest-media read shared" on storage.objects for select to authenticated
  using (bucket_id = 'forest-media' and exists (select 1 from public.forest_media m where m.path = name));

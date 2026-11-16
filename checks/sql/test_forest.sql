-- Szenarien für supabase_forest.sql. Jede Prüfung meldet "OK <name>" oder bricht mit Fehler ab.
\set ON_ERROR_STOP on
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert on storage.objects to authenticated;
grant usage, select on all sequences in schema storage to authenticated;
grant execute on all functions in schema public to authenticated;

insert into auth.users values ('00000000-0000-0000-0000-00000000000a','anna@x'), ('00000000-0000-0000-0000-00000000000b','ben@x'),
  ('00000000-0000-0000-0000-00000000000c','clara@x'), ('00000000-0000-0000-0000-00000000000d','dora@x');

create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u, false); execute 'set role authenticated'; end $$;

create or replace function pg_temp.rec(id uuid, dev text, seq int, prev text, h text) returns jsonb language sql as $$
  select jsonb_build_object('id', id, 'kind', 'habitat_tree', 'seq', seq, 'prevHash', prev, 'hash', h, 'deviceKeyId', dev, 'createdAt', now(), 'data', '{}'::jsonb) $$;

-- Anna legt Gruppe an, registriert Gerät, lädt einen Nachweis in die Gruppe
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
create temp table g as select * from public.forest_create_group('FBG Hardt', 'Anna');
insert into public.forest_devices values ('aaaaaaaaaaaaaaaa', auth.uid(), '{"kty":"EC"}');
insert into public.forest_records (id, user_id, group_id, device_key_id, seq, kind, hash, prev_hash, created_at, record)
select '10000000-0000-0000-0000-000000000001', auth.uid(), (select id from g), 'aaaaaaaaaaaaaaaa', 1, 'habitat_tree', repeat('a', 64), repeat('0', 64), now(),
  pg_temp.rec('10000000-0000-0000-0000-000000000001', 'aaaaaaaaaaaaaaaa', 1, repeat('0', 64), repeat('a', 64));
do $$ begin assert (select role from public.forest_members where user_id = auth.uid()) = 'manager'; raise notice 'OK Ersteller ist manager'; end $$;

-- Unveränderlich: auch der Eigentümer kann nichts ändern oder löschen
do $$ begin
  begin update public.forest_records set record = record || '{"data":{"bhdCm":99}}'; raise exception 'FEHLER update erlaubt';
  exception when others then if sqlerrm like 'FEHLER%' then raise; end if; end;
  delete from public.forest_records;  -- keine DELETE-Regel: RLS filtert, nichts wird gelöscht
  assert (select count(*) from public.forest_records) = 1, 'FEHLER delete hat gelöscht';
  raise notice 'OK Nachweise unveränderlich (update/delete)';
end $$;
-- Server setzt Eingangszeit selbst; record muss zu Spalten passen
do $$ begin
  begin
    insert into public.forest_records (id, user_id, device_key_id, seq, kind, hash, prev_hash, created_at, record)
    values ('10000000-0000-0000-0000-000000000002', auth.uid(), 'aaaaaaaaaaaaaaaa', 2, 'habitat_tree', repeat('b', 64), repeat('a', 64), now(),
      pg_temp.rec('10000000-0000-0000-0000-000000000002', 'aaaaaaaaaaaaaaaa', 2, repeat('a', 64), repeat('c', 64)));
    raise exception 'FEHLER inkonsistenter record akzeptiert';
  exception when others then if sqlerrm like 'FEHLER%' then raise; end if; end;
  raise notice 'OK record muss zu den Spalten passen';
end $$;
reset role;

-- Ben (fremd) sieht nichts, kann nicht mit Annas Gerät hochladen
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  assert (select count(*) from public.forest_records) = 0, 'Ben sieht fremde Nachweise';
  assert (select count(*) from public.forest_groups) = 0, 'Ben sieht fremde Gruppe';
  begin
    insert into public.forest_records (id, user_id, device_key_id, seq, kind, hash, prev_hash, created_at, record)
    values ('20000000-0000-0000-0000-000000000001', auth.uid(), 'aaaaaaaaaaaaaaaa', 9, 'habitat_tree', repeat('d', 64), repeat('0', 64), now(),
      pg_temp.rec('20000000-0000-0000-0000-000000000001', 'aaaaaaaaaaaaaaaa', 9, repeat('0', 64), repeat('d', 64)));
    raise exception 'FEHLER fremdes Gerät akzeptiert';
  exception when others then if sqlerrm like 'FEHLER%' then raise; end if; end;
  raise notice 'OK Fremde sehen nichts und können kein fremdes Gerät nutzen';
end $$;
reset role;

-- Ben tritt per Code bei → sieht Annas Nachweis und Gerät; Clara als auditor darf nicht schreiben
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select public.forest_join_group((select lower(invite_code) from g), 'Ben');
do $$ begin
  assert (select count(*) from public.forest_records) = 1, 'Mitglied sieht Gruppen-Nachweis nicht';
  assert (select count(*) from public.forest_devices) = 1, 'Mitglied sieht Geräteschlüssel nicht';
  raise notice 'OK Beitritt per Code (Groß/Klein egal), Mitglied sieht Gruppe';
end $$;
do $$ begin
  begin perform public.forest_set_role((select id from g), auth.uid(), 'manager'); raise exception 'FEHLER member darf Rollen setzen';
  exception when others then if sqlerrm like 'FEHLER%' then raise; end if; end;
  raise notice 'OK nur manager setzt Rollen';
end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select public.forest_join_group((select invite_code from g), 'Clara');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.forest_set_role((select id from g), '00000000-0000-0000-0000-00000000000c', 'auditor');
do $$ begin
  begin perform public.forest_set_role((select id from g), auth.uid(), 'member'); raise exception 'FEHLER letzter manager entfernt';
  exception when others then if sqlerrm like 'FEHLER%' then raise; end if; end;
  raise notice 'OK letzter manager bleibt';
end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.forest_devices values ('cccccccccccccccc', auth.uid(), '{"kty":"EC"}');
do $$ begin
  assert (select count(*) from public.forest_records) = 1, 'Auditor sieht nichts';
  begin
    insert into public.forest_records (id, user_id, group_id, device_key_id, seq, kind, hash, prev_hash, created_at, record)
    values ('30000000-0000-0000-0000-000000000001', auth.uid(), (select id from g), 'cccccccccccccccc', 1, 'habitat_tree', repeat('e', 64), repeat('0', 64), now(),
      pg_temp.rec('30000000-0000-0000-0000-000000000001', 'cccccccccccccccc', 1, repeat('0', 64), repeat('e', 64)));
    raise exception 'FEHLER auditor darf in Gruppe schreiben';
  exception when others then if sqlerrm like 'FEHLER%' then raise; end if; end;
  raise notice 'OK auditor liest, schreibt aber nicht in die Gruppe';
end $$;
reset role;

-- Dora (fremd) sieht keine Fotos der Gruppe; Mitglied schon
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.forest_media values ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', auth.uid(),
  '00000000-0000-0000-0000-00000000000a/40000000-0000-0000-0000-000000000001.jpg', repeat('f', 64));
insert into storage.objects (bucket_id, name) values ('forest-media', '00000000-0000-0000-0000-00000000000a/40000000-0000-0000-0000-000000000001.jpg');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
do $$ begin assert (select count(*) from storage.objects) = 0, 'Fremder sieht Foto'; raise notice 'OK Fremde sehen keine Fotos'; end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin assert (select count(*) from storage.objects) = 1, 'Mitglied sieht Foto nicht'; raise notice 'OK Mitglied sieht Fotos der Gruppe'; end $$;
reset role;
\echo ALLE SQL-TESTS BESTANDEN

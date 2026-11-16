-- BsQuik · statistiche private
-- Incolla tutto nel SQL Editor di Supabase e premi Run. Puoi rilanciarlo senza problemi.
-- Poi modifica l'email nell'ultima istruzione (sezione 4) e rilancia solo quella.

-- 1) Tabelle ---------------------------------------------------------------
create table if not exists public.owner (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table if not exists public.events (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind       text not null check (kind in ('click', 'view')),
  link       text check (link is null or char_length(link) <= 20),
  page       text not null default 'nuovo' check (page in ('nuovo', 'classico')),
  country    text not null default 'ZZ' check (country ~ '^[A-Z]{2}$'),
  visitor    text check (visitor is null or char_length(visitor) = 36),
  lang       text check (lang is null or char_length(lang) <= 10)
);
create index if not exists events_created_idx   on public.events (created_at desc);
create index if not exists events_kind_link_idx on public.events (kind, link);

-- 2) Blocco totale dall'esterno ---------------------------------------------
-- Row Level Security attivo e nessuna policy: nessuno può leggere o scrivere le tabelle
-- tramite l'API pubblica. Scrive solo la funzione "track" (chiave di servizio, lato server);
-- legge solo la funzione stats() qui sotto, e solo per te.
alter table public.owner  enable row level security;
alter table public.events enable row level security;
revoke all on table public.owner  from anon, authenticated;
revoke all on table public.events from anon, authenticated;

-- 3) Funzioni per il pannello (solo proprietario) ----------------------------
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.owner where user_id = (select auth.uid()));
$$;

create or replace function public.stats(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 3650)));
begin
  if not public.is_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'since', v_since,
    'totals', (
      select jsonb_build_object(
        'clicks',   count(*) filter (where kind = 'click'),
        'views',    count(*) filter (where kind = 'view'),
        'visitors', count(distinct visitor))
      from public.events
      where created_at >= v_since),
    'by_link', coalesce((
      select jsonb_agg(t order by t.clicks desc)
      from (select link, count(*) as clicks
            from public.events
            where kind = 'click' and created_at >= v_since
            group by link) t), '[]'::jsonb),
    'by_country', coalesce((
      select jsonb_agg(t order by t.clicks desc, t.views desc)
      from (select country,
                   count(*) filter (where kind = 'click') as clicks,
                   count(*) filter (where kind = 'view')  as views
            from public.events
            where created_at >= v_since
            group by country) t), '[]'::jsonb),
    'by_day', coalesce((
      select jsonb_agg(t order by t.day)
      from (select (created_at at time zone 'Europe/Rome')::date as day,
                   count(*) filter (where kind = 'click') as clicks,
                   count(*) filter (where kind = 'view')  as views
            from public.events
            where created_at >= v_since
            group by 1) t), '[]'::jsonb),
    'by_page', coalesce((
      select jsonb_agg(t order by t.views desc)
      from (select page,
                   count(*) filter (where kind = 'click') as clicks,
                   count(*) filter (where kind = 'view')  as views
            from public.events
            where created_at >= v_since
            group by page) t), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(t)
      from (select created_at, kind, link, page, country
            from public.events
            order by created_at desc
            limit 25) t), '[]'::jsonb)
  );
end;
$$;

-- Le funzioni di default sono eseguibili da tutti: le chiudo e le apro solo a chi ha fatto login.
revoke all on function public.is_owner()  from public, anon, authenticated;
revoke all on function public.stats(int)  from public, anon, authenticated;
grant execute on function public.is_owner()  to authenticated;
grant execute on function public.stats(int)  to authenticated;

-- 4) Chi sei tu -------------------------------------------------------------
-- Crea prima il tuo utente in Authentication → Users, poi scrivi qui la STESSA email.
insert into public.owner (user_id)
select id from auth.users where email = 'LA-TUA-EMAIL@esempio.it'
on conflict do nothing;

-- 5) (Facoltativo) cancellazione automatica dei dati dopo 12 mesi -------------
-- Abilita prima l'estensione pg_cron da Database → Extensions, poi togli i trattini:
-- select cron.schedule('bsquik-pulizia', '0 3 * * *',
--   $$ delete from public.events where created_at < now() - interval '12 months' $$);

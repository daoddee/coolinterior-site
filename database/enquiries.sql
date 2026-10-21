-- Run in the selected Supabase project's SQL editor. No public data access.
create table if not exists public.ci_enquiries (
 id uuid primary key, request_id uuid not null unique, reference text not null unique,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 name text not null, email text not null default '', phone text not null default '',
 services jsonb not null, location text not null, property text not null default '',
 timeframe text not null default '', budget text not null default '', details text not null,
 source text not null default '', status text not null default 'New' check (status in ('New','Contacted','Site visit','Quoted','Won','Lost')),
 priority text not null default 'Normal' check (priority in ('Normal','High')),
 owner text not null default '', follow_up date, value numeric check(value >= 0),
 activity jsonb not null default '[]', version integer not null default 1
);
create index if not exists ci_enquiries_created on public.ci_enquiries(created_at desc);
alter table public.ci_enquiries enable row level security;
revoke all on public.ci_enquiries from anon, authenticated;
grant select,insert,update,delete on public.ci_enquiries to service_role;
create table if not exists public.ci_rate_limits (key text primary key, hits integer not null, expires_at timestamptz not null);
alter table public.ci_rate_limits enable row level security;
revoke all on public.ci_rate_limits from anon, authenticated;
grant select,insert,update,delete on public.ci_rate_limits to service_role;
create or replace function public.ci_take_rate(p_key text,p_limit integer,p_window integer)
returns boolean language plpgsql security invoker set search_path=public as $$
declare n integer;
begin
 delete from ci_rate_limits where expires_at < now();
 insert into ci_rate_limits(key,hits,expires_at) values(p_key,1,now()+make_interval(secs=>p_window))
 on conflict(key) do update set hits=ci_rate_limits.hits+1
 returning hits into n;
 return n<=p_limit;
end $$;
revoke all on function public.ci_take_rate(text,integer,integer) from public,anon,authenticated;
grant execute on function public.ci_take_rate(text,integer,integer) to service_role;

create table if not exists public.ci_panel_owner (id text primary key check(id='owner'), password_hash text, setup_token_hash text, session_version integer not null default 1);
alter table public.ci_panel_owner enable row level security;
revoke all on public.ci_panel_owner from anon,authenticated;
grant select,insert,update on public.ci_panel_owner to service_role;
-- Provision a random one-time setup token by inserting only its SHA-256 hash into ci_panel_owner. Never commit the token.

-- Consent-based first/latest campaign details remain private with the enquiry.
alter table public.ci_enquiries add column if not exists attribution jsonb not null default '{}'::jsonb, add column if not exists qualified_at timestamptz;

-- Private photo metadata; binary files use the restricted Storage bucket.
alter table public.ci_enquiries add column if not exists photos jsonb not null default '[]'::jsonb;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('ci-enquiry-photos','ci-enquiry-photos',false,2097152,array['image/jpeg']) on conflict (id) do nothing;

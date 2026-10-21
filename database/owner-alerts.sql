create extension if not exists pg_cron;
create table public.ci_owner_alerts (
 id uuid primary key default gen_random_uuid(),
 enquiry_id uuid not null references public.ci_enquiries(id) on delete cascade,
 kind text not null check(kind in ('new','follow_up','first_contact')),
 dedupe_key text not null unique,
 reminder_date date,
 created_at timestamptz not null default now(),
 read_at timestamptz,
 resolved_at timestamptz
);
create index ci_owner_alerts_open on public.ci_owner_alerts(created_at desc) where resolved_at is null;
alter table public.ci_owner_alerts enable row level security;
revoke all on public.ci_owner_alerts from public,anon,authenticated;
grant select,insert,update,delete on public.ci_owner_alerts to service_role;

create or replace function public.ci_enquiry_alert_trigger()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' then
  insert into public.ci_owner_alerts(enquiry_id,kind,dedupe_key) values(new.id,'new','new:'||new.id) on conflict(dedupe_key) do nothing;
 else
  update public.ci_owner_alerts set resolved_at=now()
  where enquiry_id=new.id and resolved_at is null and (
   (kind in ('new','first_contact') and new.status<>'New') or
   (kind='follow_up' and (new.status in ('Won','Lost') or new.follow_up is null or new.follow_up>=(now() at time zone 'Europe/London')::date or new.follow_up is distinct from old.follow_up))
  );
 end if;
 return new;
end $$;
revoke all on function public.ci_enquiry_alert_trigger() from public,anon,authenticated;
grant execute on function public.ci_enquiry_alert_trigger() to service_role;
create trigger ci_enquiry_owner_alert after insert or update of status,follow_up on public.ci_enquiries for each row execute function public.ci_enquiry_alert_trigger();

create or replace function public.ci_refresh_owner_alerts()
returns integer language plpgsql security invoker set search_path='' as $$
declare local_time timestamp:=now() at time zone 'Europe/London'; total integer:=0; n integer;
begin
 update public.ci_owner_alerts a set resolved_at=now() from public.ci_enquiries e
 where a.enquiry_id=e.id and a.resolved_at is null and (
  (a.kind in ('new','first_contact') and e.status<>'New') or
  (a.kind='follow_up' and (e.status in ('Won','Lost') or e.follow_up is null or e.follow_up>=local_time::date))
 );
 -- Reminder generation runs on weekdays from 09:00 London time; one per enquiry/kind/day.
 if extract(isodow from local_time)>5 or extract(hour from local_time)<9 then return 0;end if;
 update public.ci_owner_alerts set resolved_at=now() where resolved_at is null and kind in ('follow_up','first_contact') and reminder_date<local_time::date;
 insert into public.ci_owner_alerts(enquiry_id,kind,dedupe_key,reminder_date)
 select e.id,'follow_up','follow:'||e.id||':'||local_time::date,local_time::date from public.ci_enquiries e
 where e.follow_up<local_time::date and e.status not in ('Won','Lost') on conflict(dedupe_key) do nothing;
 get diagnostics n=row_count;total:=total+n;
 insert into public.ci_owner_alerts(enquiry_id,kind,dedupe_key,reminder_date)
 select e.id,'first_contact','contact:'||e.id||':'||local_time::date,local_time::date from public.ci_enquiries e
 where e.status='New' and (e.follow_up is null or e.follow_up>=local_time::date) and e.created_at<now()-interval '24 hours' on conflict(dedupe_key) do nothing;
 get diagnostics n=row_count;return total+n;
end $$;
revoke all on function public.ci_refresh_owner_alerts() from public,anon,authenticated;
grant execute on function public.ci_refresh_owner_alerts() to service_role;

create or replace function public.ci_owner_alert_summary()
returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object(
 'unread',(select count(*) from public.ci_owner_alerts where resolved_at is null and read_at is null),
 'items',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
  select a.id,a.enquiry_id,a.kind,a.created_at,a.read_at,e.reference,e.follow_up
  from public.ci_owner_alerts a join public.ci_enquiries e on e.id=a.enquiry_id
  where a.resolved_at is null order by a.created_at desc limit 50
 )x),'[]'::jsonb),
 'email_connected',false,
 'reminder_timezone','Europe/London'
 );
$$;
revoke all on function public.ci_owner_alert_summary() from public,anon,authenticated;
grant execute on function public.ci_owner_alert_summary() to service_role;

create or replace function public.ci_owner_alerts_read(p_ids uuid[])
returns integer language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 if coalesce(array_length(p_ids,1),0)>50 then raise exception 'Too many alerts';end if;
 update public.ci_owner_alerts set read_at=coalesce(read_at,now()) where id=any(p_ids) and resolved_at is null;
 get diagnostics n=row_count;return n;
end $$;
revoke all on function public.ci_owner_alerts_read(uuid[]) from public,anon,authenticated;
grant execute on function public.ci_owner_alerts_read(uuid[]) to service_role;

select cron.schedule('ci-owner-follow-up-reminders','*/15 * * * *','select public.ci_refresh_owner_alerts();');

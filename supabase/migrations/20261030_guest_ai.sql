-- Run after schema.sql. Adds durable guest limits and richer AI explanations.
begin;
alter table public.ai_results add column if not exists visual_attributes jsonb not null default '[]'::jsonb;
alter table public.ai_results add column if not exists cost_impact text not null default '';
alter table public.ai_results add column if not exists seasonal_insight text not null default '';
alter table public.ai_results add column if not exists seasonal_context jsonb not null default '{}'::jsonb;
alter table public.ai_results add column if not exists model text;
alter table public.ai_results drop constraint if exists ai_results_source_check;
alter table public.ai_results add constraint ai_results_source_check check(source in ('demo','grok','gemini'));
create table if not exists public.guest_analyses (
 id uuid primary key, session_key text not null, product jsonb not null,
 created_at timestamptz not null default now(), expires_at timestamptz not null default (now()+interval '24 hours'),
 claimed_by uuid references next_auth.users(id) on delete cascade
);
create index if not exists guest_analyses_session on public.guest_analyses(session_key,created_at desc);
alter table public.guest_analyses enable row level security;
revoke all on public.guest_analyses from anon,authenticated;
grant all on public.guest_analyses to service_role;

create or replace function public.guest_trial_status(p_session_key text,p_ip_key text)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare s integer; i integer; day text:=to_char(timezone('UTC',now()),'YYYY-MM-DD');
begin
 select coalesce(max(attempts),0) into s from public.request_limits where key='guest:session:'||p_session_key and expires_at>now();
 select coalesce(max(attempts),0) into i from public.request_limits where key='guest:ip:'||day||':'||p_ip_key and expires_at>now();
 return jsonb_build_object('remaining',greatest(0,least(2-s,2-i)));
end $$;

-- Locks all three buckets in a stable order; check + increment is one transaction.
-- Cookie deletion cannot evade the IP counter. Session quota lasts 7 days; IP/global reset at UTC midnight.
create or replace function public.reserve_guest_trial(p_session_key text,p_ip_key text,p_daily_limit integer default 20)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 day text:=to_char(timezone('UTC',now()),'YYYY-MM-DD');
 sk text:='guest:session:'||p_session_key; ik text; gk text;
 k text; s integer; i integer; g integer;
 day_end timestamptz:=(date_trunc('day',now() at time zone 'UTC')+interval '1 day') at time zone 'UTC';
begin
 if p_session_key !~ '^[a-f0-9]{64}$' or p_ip_key !~ '^[a-f0-9]{64}$' or p_daily_limit<1 or p_daily_limit>100 then raise exception 'Invalid guest limit request'; end if;
 ik:='guest:ip:'||day||':'||p_ip_key; gk:='guest:global:'||day;
 for k in select unnest(array[sk,ik,gk]) order by 1 loop perform pg_advisory_xact_lock(hashtextextended(k,0)); end loop;
 select coalesce(max(attempts),0) into s from public.request_limits where key=sk and expires_at>now();
 select coalesce(max(attempts),0) into i from public.request_limits where key=ik and expires_at>now();
 select coalesce(max(attempts),0) into g from public.request_limits where key=gk and expires_at>now();
 if s>=2 then return jsonb_build_object('allowed',false,'remaining',0,'reason','session'); end if;
 if i>=2 then return jsonb_build_object('allowed',false,'remaining',0,'reason','ip'); end if;
 if g>=p_daily_limit then return jsonb_build_object('allowed',false,'remaining',least(2-s,2-i),'reason','budget'); end if;
 insert into public.request_limits(key,attempts,expires_at) values(sk,s+1,now()+interval '7 days') on conflict(key) do update set attempts=excluded.attempts,expires_at=case when request_limits.expires_at>now() then request_limits.expires_at else excluded.expires_at end;
 insert into public.request_limits(key,attempts,expires_at) values(ik,i+1,day_end),(gk,g+1,day_end) on conflict(key) do update set attempts=excluded.attempts,expires_at=excluded.expires_at;
 -- Guest photos/results are temporary; no user history exists until an explicit claim after login.
 delete from public.guest_analyses where expires_at<now();
 delete from public.request_limits where key like 'guest:%' and expires_at<now()-interval '1 day';
 return jsonb_build_object('allowed',true,'remaining',least(1-s,1-i));
end $$;
revoke all on function public.guest_trial_status(text,text) from public,anon,authenticated;
revoke all on function public.reserve_guest_trial(text,text,integer) from public,anon,authenticated;
grant execute on function public.guest_trial_status(text,text) to service_role;
grant execute on function public.reserve_guest_trial(text,text,integer) to service_role;

create or replace function public.save_product_analysis(p_product jsonb,p_analysis jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare pid uuid := (p_product->>'id')::uuid;
begin
 insert into public.products(id,user_id,name,category,material,production_cost,image_url)
 values(pid,(p_product->>'user_id')::uuid,p_product->>'name',p_product->>'category',p_product->>'material',(p_product->>'production_cost')::numeric,p_product->>'image_url');
 insert into public.ai_results(product_id,price_min,price_max,price_reasoning,desc_marketplace,desc_instagram,strategy_recommendation,best_timing,visual_score,visual_advice,source,visual_attributes,cost_impact,seasonal_insight,seasonal_context,model)
 values(pid,(p_analysis->>'price_min')::numeric,(p_analysis->>'price_max')::numeric,p_analysis->>'price_reasoning',p_analysis->>'desc_marketplace',p_analysis->>'desc_instagram',p_analysis->>'strategy_recommendation',p_analysis->>'best_timing',coalesce((p_analysis->>'visual_score')::numeric,0),coalesce(p_analysis->'visual_advice','[]'::jsonb),p_analysis->>'source',coalesce(p_analysis->'visual_attributes','[]'::jsonb),coalesce(p_analysis->>'cost_impact',''),coalesce(p_analysis->>'seasonal_insight',''),coalesce(p_analysis->'seasonal_context','{}'::jsonb),p_analysis->>'model');
 return pid;
end $$;
commit;

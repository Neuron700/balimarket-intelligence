-- BaliMarket Intelligence. Run once in Supabase SQL Editor as postgres.
-- Add next_auth to Settings > API > Exposed schemas for the Auth.js adapter.
-- No public/anon browser access is required: all reads/writes use server routes.
begin;
create extension if not exists pgcrypto;
create schema if not exists next_auth;
grant usage on schema next_auth to service_role;

create table if not exists next_auth.users (
 id uuid primary key default gen_random_uuid(), name text, email text unique,
 "emailVerified" timestamptz, image text
);
create unique index if not exists users_email_lower on next_auth.users (lower(email));
create table if not exists next_auth.accounts (
 id uuid primary key default gen_random_uuid(), type text not null, provider text not null,
 "providerAccountId" text not null, refresh_token text, access_token text, expires_at bigint,
 token_type text, scope text, id_token text, session_state text, oauth_token_secret text,
 oauth_token text, "userId" uuid not null references next_auth.users(id) on delete cascade,
 unique(provider,"providerAccountId")
);
create table if not exists next_auth.sessions (
 id uuid primary key default gen_random_uuid(), expires timestamptz not null,
 "sessionToken" text not null unique, "userId" uuid not null references next_auth.users(id) on delete cascade
);
create index if not exists sessions_user_idx on next_auth.sessions("userId",expires);
create table if not exists next_auth.verification_tokens (
 identifier text, token text primary key, expires timestamptz not null,
 unique(identifier,token)
);
create table if not exists public.user_credentials (
 user_id uuid primary key references next_auth.users(id) on delete cascade,
 password_hash text not null, created_at timestamptz not null default now()
);
create table if not exists public.products (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references next_auth.users(id) on delete cascade,
 name text not null check(char_length(name) between 3 and 100), category text not null,
 material text not null, production_cost numeric(14,2) not null check(production_cost>0),
 image_url text not null, created_at timestamptz not null default now(), unique(id,user_id)
);
create index if not exists products_user_created on public.products(user_id,created_at desc);
create table if not exists public.ai_results (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
 price_min numeric(14,2) not null check(price_min>0), price_max numeric(14,2) not null check(price_max>=price_min),
 price_reasoning text not null, desc_marketplace text not null, desc_instagram text not null,
 strategy_recommendation text not null, best_timing text not null,
 visual_score numeric not null default 0 check(visual_score between 0 and 100),
 visual_advice jsonb not null default '[]'::jsonb,
 source text not null default 'grok' check(source in ('grok','demo')),
 created_at timestamptz not null default now()
);
create index if not exists ai_results_product_created on public.ai_results(product_id,created_at desc);
create table if not exists public.sales_feedback (
 id uuid primary key default gen_random_uuid(), product_id uuid not null,
 user_id uuid not null references next_auth.users(id) on delete cascade,
 status text not null check(status in ('terjual','tidak_laku')),
 actual_price numeric(14,2) not null check(actual_price>0), notes text not null default '' check(char_length(notes)<=500),
 created_at timestamptz not null default now(),
 foreign key(product_id,user_id) references public.products(id,user_id) on delete cascade
);
create index if not exists feedback_user_created on public.sales_feedback(user_id,created_at desc);
create table if not exists public.seasonal_calendar (
 id uuid primary key default gen_random_uuid(), category text not null,
 period_start date not null, period_end date not null check(period_end>=period_start),
 demand_level text not null check(demand_level in ('rendah','sedang','tinggi')),
 notes text not null, unique(category,period_start,period_end)
);
create index if not exists calendar_category_period on public.seasonal_calendar(category,period_start,period_end);
create table if not exists public.request_limits (
 key text primary key, attempts integer not null default 1, expires_at timestamptz not null
);

-- Defense in depth. No anon/authenticated grants or permissive policies.
-- Server routes use a service role and independently scope every query by session.user.id.
alter table next_auth.users enable row level security;
alter table next_auth.accounts enable row level security;
alter table next_auth.sessions enable row level security;
alter table next_auth.verification_tokens enable row level security;
alter table public.user_credentials enable row level security;
alter table public.products enable row level security;
alter table public.ai_results enable row level security;
alter table public.sales_feedback enable row level security;
alter table public.seasonal_calendar enable row level security;
alter table public.request_limits enable row level security;
revoke all on all tables in schema next_auth from anon,authenticated;
revoke all on public.user_credentials,public.products,public.ai_results,public.sales_feedback,public.seasonal_calendar,public.request_limits from anon,authenticated;
grant all on all tables in schema next_auth to service_role;
grant all on public.user_credentials,public.products,public.ai_results,public.sales_feedback,public.seasonal_calendar,public.request_limits to service_role;

create or replace function public.consume_rate_limit(p_key text,p_limit integer,p_window_seconds integer)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare counter integer;
begin
 if p_limit<1 or p_limit>1000 or p_window_seconds<1 or p_window_seconds>86400 then return false; end if;
 insert into public.request_limits(key,attempts,expires_at) values(p_key,1,now()+make_interval(secs=>p_window_seconds))
 on conflict(key) do update set
 attempts=case when request_limits.expires_at<=now() then 1 else request_limits.attempts+1 end,
 expires_at=case when request_limits.expires_at<=now() then now()+make_interval(secs=>p_window_seconds) else request_limits.expires_at end
 returning attempts into counter;
 return counter<=p_limit;
end $$;

create or replace function public.register_local_user(p_name text,p_email text,p_hash text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid;
begin
 if char_length(p_name)<2 or char_length(p_name)>80 or char_length(p_email)>254 or p_hash not like 'scrypt$32768$8$3$%' then raise exception 'Invalid registration'; end if;
 insert into next_auth.users(name,email) values(p_name,lower(trim(p_email))) returning id into uid;
 insert into public.user_credentials(user_id,password_hash) values(uid,p_hash);
 return uid;
exception when unique_violation then return null;
end $$;

-- Product + result are committed together; the route cleans up the image on failure.
create or replace function public.save_product_analysis(p_product jsonb,p_analysis jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare pid uuid := (p_product->>'id')::uuid;
begin
 insert into public.products(id,user_id,name,category,material,production_cost,image_url)
 values(pid,(p_product->>'user_id')::uuid,p_product->>'name',p_product->>'category',p_product->>'material',(p_product->>'production_cost')::numeric,p_product->>'image_url');
 insert into public.ai_results(product_id,price_min,price_max,price_reasoning,desc_marketplace,desc_instagram,strategy_recommendation,best_timing,visual_score,visual_advice,source)
 values(pid,(p_analysis->>'price_min')::numeric,(p_analysis->>'price_max')::numeric,p_analysis->>'price_reasoning',p_analysis->>'desc_marketplace',p_analysis->>'desc_instagram',p_analysis->>'strategy_recommendation',p_analysis->>'best_timing',coalesce((p_analysis->>'visual_score')::numeric,0),coalesce(p_analysis->'visual_advice','[]'::jsonb),p_analysis->>'source');
 return pid;
end $$;
revoke all on function public.consume_rate_limit(text,integer,integer) from public,anon,authenticated;
revoke all on function public.register_local_user(text,text,text) from public,anon,authenticated;
revoke all on function public.save_product_analysis(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer) to service_role;
grant execute on function public.register_local_user(text,text,text) to service_role;
grant execute on function public.save_product_analysis(jsonb,jsonb) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('product-images','product-images',false,3145728,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
-- Private storage: downloads are proxied by /api/products/[id]/image after ownership validation.

-- General planning assumptions, not measured demand data. Religious dates intentionally unseeded.
insert into public.seasonal_calendar(category,period_start,period_end,demand_level,notes) values
('Semua kategori','2026-06-01','2026-08-31','tinggi','Asumsi perencanaan liburan pertengahan tahun. Siapkan stok 3–4 minggu sebelumnya; validasi dengan histori usaha.'),
('Semua kategori','2026-12-01','2027-01-05','tinggi','Asumsi perencanaan liburan akhir tahun. Prioritaskan paket hadiah/oleh-oleh. Bukan prediksi berbasis data turis langsung.'),
('Semua kategori','2027-01-06','2027-02-28','rendah','Asumsi periode lebih tenang. Uji bundling dan pelanggan lokal; acara khusus dapat mengubah pola.'),
('Semua kategori','2027-06-01','2027-08-31','tinggi','Pola umum liburan pertengahan tahun. Pastikan stok dan produksi sesuai kapasitas.'),
('Semua kategori','2027-12-01','2028-01-05','tinggi','Pola umum liburan akhir tahun. Siapkan promosi 3–4 minggu sebelumnya.')
on conflict(category,period_start,period_end) do nothing;
commit;

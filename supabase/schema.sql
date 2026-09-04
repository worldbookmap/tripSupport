-- Supabase SQL Editor에서 실행하세요.

create extension if not exists pgcrypto;

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lat double precision not null,
  lng double precision not null,
  history text not null default '',
  tourist_info text not null default '',
  region text not null default '기타', -- 대륙: 유럽/중동/아시아/북미/남미/기타
  category text not null default 'general', -- 구분: general(일반)/food(음식)
  country text not null default '', -- 나라
  city text not null default '', -- 도시
  district text not null default '', -- 구/지구 (도시 하위 명칭)
  address text not null default '', -- 전체 주소 (지오코딩 formatted_address)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 기존에 만든 테이블에도 반영되도록 (이미 있으면 무시됨)
alter table locations add column if not exists country text not null default '';
alter table locations add column if not exists city text not null default '';
alter table locations add column if not exists district text not null default '';
alter table locations add column if not exists category text not null default 'general';
alter table locations add column if not exists address text not null default '';
alter table locations drop constraint if exists locations_category_check;
alter table locations add constraint locations_category_check check (category in ('general', 'food'));

create index if not exists locations_category_idx on locations(category);

create table if not exists authors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  bio text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  source_id text, -- 카카오 도서 API의 ISBN
  title text not null,
  thumbnail_url text,
  description text not null default '',
  location_id uuid references locations(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists book_authors (
  book_id uuid not null references books(id) on delete cascade,
  author_id uuid not null references authors(id) on delete cascade,
  primary key (book_id, author_id)
);

create table if not exists historical_events (
  id uuid primary key default gen_random_uuid(),
  year integer not null, -- 음수 = BC
  title text not null,
  description text not null default '',
  location_id uuid references locations(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists books_location_id_idx on books(location_id);
create index if not exists historical_events_location_id_idx on historical_events(location_id);
create index if not exists historical_events_year_idx on historical_events(year);
create index if not exists book_authors_author_id_idx on book_authors(author_id);
create index if not exists locations_country_idx on locations(country);
create index if not exists locations_city_idx on locations(city);

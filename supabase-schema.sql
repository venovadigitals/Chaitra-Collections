-- ============================================================================
-- Chaitra Collections — Supabase schema
-- Run this ONCE in your Supabase project's SQL editor:
-- Project dashboard -> SQL Editor -> New query -> paste this whole file -> Run
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Products
-- "image" stays as the single thumbnail used on cards/listing grids
-- (kept in sync with images[0]). "images" holds the full gallery of
-- 1-5 photos shown on the product detail page.
-- ---------------------------------------------------------------------------
create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text not null,
  price       numeric not null default 0,
  sale_price  numeric not null default 0,
  stock       int not null default 0,
  image       text,
  images      jsonb not null default '[]'::jsonb,
  status      text not null default 'active' check (status in ('active', 'draft')),
  featured    boolean not null default false,
  tag         text default '',
  created_at  timestamptz not null default now()
);

-- If you already ran an earlier version of this schema, run this instead
-- of the create table above (safe to run even if the column already
-- exists). It also backfills "images" from the existing single "image"
-- column for any products created before this change.
alter table products add column if not exists images jsonb not null default '[]'::jsonb;
update products set images = jsonb_build_array(image) where images = '[]'::jsonb and image is not null and image <> '';

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------
create table if not exists customers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text unique,
  phone       text,
  joined_at   date not null default current_date
);

-- ---------------------------------------------------------------------------
-- Orders
-- items is stored as JSON: [{ "name": "...", "qty": 1, "price": 6499 }, ...]
--
-- customer_phone / shipping_* capture what the checkout form actually
-- collects, so a shipping label can be printed straight from an order
-- without having to cross-reference the customers table (whose phone
-- number may have changed since this order was placed).
-- ---------------------------------------------------------------------------
create table if not exists orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      text,
  customer_email    text,
  customer_name     text,
  customer_phone    text,
  shipping_address  text,
  shipping_city     text,
  shipping_pincode  text,
  order_date        date not null default current_date,
  items             jsonb not null default '[]'::jsonb,
  total             numeric not null default 0,
  status            text not null default 'pending' check (status in ('pending', 'shipped', 'delivered', 'cancelled')),
  created_at        timestamptz not null default now()
);

-- If you already ran an earlier version of this schema and the orders
-- table exists without these columns, run this instead of the create
-- table above (safe to run even if the columns already exist):
alter table orders add column if not exists customer_phone   text;
alter table orders add column if not exists shipping_address text;
alter table orders add column if not exists shipping_city    text;
alter table orders add column if not exists shipping_pincode text;

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- IMPORTANT: these policies are intentionally permissive (anyone holding
-- the public "anon" key — which is embedded in the site's JavaScript —
-- can read AND write every table). This matches where the project is
-- today: the admin dashboard only has a client-side password check, not
-- real authentication, so there's no "authenticated admin" role yet for
-- RLS to key off of.
--
-- Before this store goes live for real, do this instead:
--   1. Turn on Supabase Auth and give your admin account a real login.
--   2. Replace these "true" policies with ones like:
--        using (auth.role() = 'authenticated')
--      for insert/update/delete, so only a logged-in admin can write.
--   3. Keep public SELECT on products (status = 'active') so the
--      storefront can still show products to anonymous shoppers.
-- ---------------------------------------------------------------------------

alter table products enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;

drop policy if exists "public read products" on products;
drop policy if exists "public insert products" on products;
drop policy if exists "public update products" on products;
drop policy if exists "public delete products" on products;

create policy "public read products" on products
  for select using (true);
create policy "public insert products" on products
  for insert with check (true);
create policy "public update products" on products
  for update using (true);
create policy "public delete products" on products
  for delete using (true);

drop policy if exists "public read customers" on customers;
drop policy if exists "public insert customers" on customers;
drop policy if exists "public update customers" on customers;

create policy "public read customers" on customers
  for select using (true);
create policy "public insert customers" on customers
  for insert with check (true);
create policy "public update customers" on customers
  for update using (true);

drop policy if exists "public read orders" on orders;
drop policy if exists "public insert orders" on orders;
drop policy if exists "public update orders" on orders;

create policy "public read orders" on orders
  for select using (true);
create policy "public insert orders" on orders
  for insert with check (true);
create policy "public update orders" on orders
  for update using (true);

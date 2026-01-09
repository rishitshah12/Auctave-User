-- 1. Create clients table (replaces profiles for regular users)
create table if not exists clients (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  name text,
  company_name text,
  phone text,
  email text,
  country text,
  job_role text,
  category_specialization text,
  yearly_est_revenue text
);

-- 2. Create admins table
create table if not exists admins (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  name text,
  company_name text,
  phone text,
  email text,
  country text,
  job_role text,
  category_specialization text,
  yearly_est_revenue text,
  role text default 'admin'
);

-- 3. Enable Row Level Security (RLS)
alter table clients enable row level security;
alter table admins enable row level security;

-- 4. Policies for CLIENTS
-- Clients can view, insert, and update ONLY their own profile
drop policy if exists "Clients can view own profile" on clients;
create policy "Clients can view own profile" on clients for select using (auth.uid() = id);
drop policy if exists "Clients can insert own profile" on clients;
create policy "Clients can insert own profile" on clients for insert with check (auth.uid() = id);
drop policy if exists "Clients can update own profile" on clients;
create policy "Clients can update own profile" on clients for update using (auth.uid() = id);

-- 5. Policies for ADMINS (Self Management)
-- Admins can view, insert, and update ONLY their own admin profile
drop policy if exists "Admins can view own profile" on admins;
create policy "Admins can view own profile" on admins for select using (auth.uid() = id);
drop policy if exists "Admins can insert own profile" on admins;
create policy "Admins can insert own profile" on admins for insert with check (auth.uid() = id);
drop policy if exists "Admins can update own profile" on admins;
create policy "Admins can update own profile" on admins for update using (auth.uid() = id);

-- 6. Policies for ADMINS (Client Management)
-- STRICTLY allow access to 'clients' table ONLY if the user's email ends with @auctaveexports.com
drop policy if exists "Admins can view all clients" on clients;
create policy "Admins can view all clients" on clients for select to authenticated using (auth.jwt() ->> 'email' like '%@auctaveexports.com');
drop policy if exists "Admins can update all clients" on clients;
create policy "Admins can update all clients" on clients for update to authenticated using (auth.jwt() ->> 'email' like '%@auctaveexports.com');
drop policy if exists "Admins can delete clients" on clients;
create policy "Admins can delete clients" on clients for delete to authenticated using (auth.jwt() ->> 'email' like '%@auctaveexports.com');

-- 7. Create factories table (Required for CRM Orders FK)
create table if not exists factories (
  id uuid default gen_random_uuid() primary key,
  name text,
  location text,
  description text,
  rating numeric,
  minimum_order_quantity integer,
  cover_image_url text,
  gallery text[],
  tags text[],
  specialties text[],
  certifications text[],
  machine_slots jsonb,
  catalog jsonb,
  turnaround text,
  offer text,
  status text default 'published',
  created_by uuid references auth.users,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table factories enable row level security;

-- Policies for factories
drop policy if exists "Everyone can view factories" on factories;
create policy "Everyone can view factories" on factories for select using (true);
drop policy if exists "Admins can insert factories" on factories;
create policy "Admins can insert factories" on factories for insert to authenticated with check (auth.jwt() ->> 'email' like '%@auctaveexports.com');
drop policy if exists "Admins can update factories" on factories;
create policy "Admins can update factories" on factories for update to authenticated using (auth.jwt() ->> 'email' like '%@auctaveexports.com');
drop policy if exists "Admins can delete factories" on factories;
create policy "Admins can delete factories" on factories for delete to authenticated using (auth.jwt() ->> 'email' like '%@auctaveexports.com');

-- 8. Create crm_orders table (Required for AdminCRMPage)
create table if not exists crm_orders (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.clients(id),
  product_name text,
  status text,
  tasks jsonb,
  documents jsonb,
  factory_id uuid references public.factories(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table crm_orders enable row level security;

-- Policies for crm_orders
-- Admins can manage all orders
drop policy if exists "Admins can view all orders" on crm_orders;
create policy "Admins can view all orders" on crm_orders for select to authenticated using (auth.jwt() ->> 'email' like '%@auctaveexports.com');
drop policy if exists "Admins can insert orders" on crm_orders;
create policy "Admins can insert orders" on crm_orders for insert to authenticated with check (auth.jwt() ->> 'email' like '%@auctaveexports.com');
drop policy if exists "Admins can update orders" on crm_orders;
create policy "Admins can update orders" on crm_orders for update to authenticated using (auth.jwt() ->> 'email' like '%@auctaveexports.com');
drop policy if exists "Admins can delete orders" on crm_orders;
create policy "Admins can delete orders" on crm_orders for delete to authenticated using (auth.jwt() ->> 'email' like '%@auctaveexports.com');

-- Clients can view their own orders
drop policy if exists "Clients can view own orders" on crm_orders;
create policy "Clients can view own orders" on crm_orders for select using (auth.uid() = client_id);
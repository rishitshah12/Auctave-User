-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Create the factories table
create table if not exists factories (
  id uuid primary key default uuid_generate_v4(),
  factory_name text not null,
  country text not null,
  state text,
  city text,
  turn_around_time text,
  moq text not null,
  promotional_offer text,
  tags text not null,
  description text,
  factory_type text,
  production_capacity text,
  certifications text[],
  machinery_details text,
  specialities text not null,
  status text default 'published', -- draft | published | inactive
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
-- ============================================================
-- Golf Charity Platform — Supabase Database Schema
-- Run this in the Supabase SQL Editor for your new project
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Users ────────────────────────────────────────────────────
create table users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  password_hash text not null,
  full_name text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_active boolean not null default true,
  handicap numeric(4,1),
  stripe_customer_id text unique,
  charity_id uuid,
  charity_percentage integer not null default 10 check (charity_percentage >= 10 and charity_percentage <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- ── Refresh Tokens ────────────────────────────────────────────
create table refresh_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  token text unique not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index idx_refresh_tokens_user on refresh_tokens(user_id);
create index idx_refresh_tokens_token on refresh_tokens(token);

-- ── Subscriptions ────────────────────────────────────────────
create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  plan text not null check (plan in ('monthly', 'yearly')),
  status text not null check (status in ('active', 'past_due', 'cancelled', 'lapsed', 'trialing')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index idx_subscriptions_user on subscriptions(user_id);
create index idx_subscriptions_status on subscriptions(status);

-- ── Scores ────────────────────────────────────────────────────
create table scores (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  score integer not null check (score >= 1 and score <= 45),
  played_at date not null,
  course_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index idx_scores_user on scores(user_id);
create index idx_scores_user_date on scores(user_id, played_at desc);

-- ── Charities ────────────────────────────────────────────────
create table charities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text not null,
  logo_url text,
  banner_url text,
  category text,
  website text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Charity Events ────────────────────────────────────────────
create table charity_events (
  id uuid primary key default uuid_generate_v4(),
  charity_id uuid not null references charities(id) on delete cascade,
  title text not null,
  description text,
  event_date timestamptz not null,
  location text,
  registration_url text,
  created_at timestamptz not null default now()
);

-- ── Charity Contributions ─────────────────────────────────────
create table charity_contributions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id),
  charity_id uuid not null references charities(id),
  amount numeric(10,2) not null,
  type text not null check (type in ('subscription', 'direct')),
  created_at timestamptz not null default now()
);
create index idx_contributions_charity on charity_contributions(charity_id);

-- ── Draws ─────────────────────────────────────────────────────
create table draws (
  id uuid primary key default uuid_generate_v4(),
  draw_date date not null,
  winning_numbers integer[] not null,
  method text not null default 'random' check (method in ('random', 'algorithmic')),
  status text not null default 'pending' check (status in ('pending', 'published', 'cancelled')),
  total_pool numeric(10,2),
  winner_count integer default 0,
  jackpot_rollover numeric(10,2) default 0,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

-- ── Draw Results (Winners) ────────────────────────────────────
create table draw_results (
  id uuid primary key default uuid_generate_v4(),
  draw_id uuid not null references draws(id),
  user_id uuid not null references users(id),
  match_type text not null check (match_type in ('5-match', '4-match', '3-match')),
  prize_amount numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'under_review', 'approved', 'rejected', 'paid')),
  proof_url text,
  admin_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_draw_results_user on draw_results(user_id);
create index idx_draw_results_draw on draw_results(draw_id);
create index idx_draw_results_status on draw_results(status);

-- ── Foreign key: users → charities ────────────────────────────
alter table users add constraint fk_users_charity foreign key (charity_id) references charities(id);

-- ── Seed: Default admin user (change password immediately!) ───
-- Password: Admin@1234 (bcrypt hash)
insert into users (email, password_hash, full_name, role) values (
  'admin@golfcharity.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCkJ9mGq2LjJfj8Kc5CqC3y',
  'Platform Admin',
  'admin'
);

-- ── Seed: Sample charities ────────────────────────────────────
insert into charities (name, description, category, is_featured) values
  ('Cancer Research UK', 'Fighting cancer through world-class research, working across every type of cancer. Every golf round played supports life-saving work.', 'Health', true),
  ('Age UK', 'Supporting older people to live their best lives. Community events and support services nationwide.', 'Community', false),
  ('British Heart Foundation', 'Funding pioneering research to beat heart and circulatory diseases — the UK''s biggest killer.', 'Health', false),
  ('Macmillan Cancer Support', 'Providing medical, emotional, practical and financial support for people living with cancer.', 'Health', false),
  ('Alzheimer''s Society', 'United against dementia through campaigning, research, and providing essential support services.', 'Health', false);

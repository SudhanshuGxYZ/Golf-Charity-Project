-- ============================================================
-- Golf Charity Platform — Full Schema (v1 updated)
-- Run this in Supabase SQL Editor for your new project
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── Users ─────────────────────────────────────────────────────
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
  credits integer not null default 0,
  total_credits_earned integer not null default 0,
  last_score_submission_date date,
  total_score_submissions integer not null default 0,
  phone text,
  avatar_url text,
  last_login_at timestamptz,
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

-- ── Subscriptions ─────────────────────────────────────────────
create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  plan text not null check (plan in ('monthly', 'yearly', 'unlimited')),
  status text not null check (status in ('active', 'past_due', 'cancelled', 'lapsed', 'trialing', 'paused')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index idx_subscriptions_user on subscriptions(user_id);
create index idx_subscriptions_status on subscriptions(status);

-- ── Subscription History ──────────────────────────────────────
create table subscription_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  subscription_id uuid references subscriptions(id),
  event text not null,
  plan text,
  amount numeric(10,2),
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ── Score Sessions (one per user per day, 5 scores each) ─────
create table score_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  submitted_at date not null default current_date,
  is_complete boolean not null default false,
  draw_month text not null,
  created_at timestamptz not null default now(),
  unique(user_id, submitted_at)
);
create index idx_sessions_user on score_sessions(user_id);
create index idx_sessions_month on score_sessions(draw_month);

-- ── Scores ────────────────────────────────────────────────────
create table scores (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  session_id uuid references score_sessions(id) on delete cascade,
  score integer not null check (score >= 1 and score <= 45),
  played_at date not null,
  course_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index idx_scores_user on scores(user_id);
create index idx_scores_session on scores(session_id);
create index idx_scores_user_date on scores(user_id, played_at desc);

-- ── Credits ───────────────────────────────────────────────────
create table credit_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  amount integer not null,
  balance_after integer not null,
  type text not null check (type in ('admin_grant','admin_deduct','draw_win_bonus','referral','score_streak','subscription_bonus','prize_redemption')),
  description text not null,
  reference_id uuid,
  granted_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index idx_credits_user on credit_transactions(user_id);

-- ── Charities ─────────────────────────────────────────────────
create table charities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text not null,
  long_description text,
  logo_url text,
  banner_url text,
  category text,
  website text,
  registration_number text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  sort_order integer default 99,
  created_at timestamptz not null default now(),
  updated_at timestamptz
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
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Charity Contributions ─────────────────────────────────────
create table charity_contributions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id),
  charity_id uuid not null references charities(id),
  amount numeric(10,2) not null,
  type text not null check (type in ('subscription', 'direct')),
  subscription_id uuid references subscriptions(id),
  created_at timestamptz not null default now()
);
create index idx_contributions_charity on charity_contributions(charity_id);
create index idx_contributions_user on charity_contributions(user_id);

-- ── Prize Pool Config ─────────────────────────────────────────
create table prize_pool_config (
  id uuid primary key default uuid_generate_v4(),
  five_match_pct numeric(5,2) not null default 40.00,
  four_match_pct numeric(5,2) not null default 35.00,
  three_match_pct numeric(5,2) not null default 25.00,
  subscription_pool_pct numeric(5,2) not null default 60.00,
  charity_min_pct numeric(5,2) not null default 10.00,
  monthly_price numeric(10,2) not null default 29.99,
  yearly_price numeric(10,2) not null default 299.99,
  is_active boolean not null default true,
  updated_by uuid references users(id),
  updated_at timestamptz,
  created_at timestamptz not null default now()
);

-- ── Draws ─────────────────────────────────────────────────────
create table draws (
  id uuid primary key default uuid_generate_v4(),
  draw_date date not null,
  draw_month text not null,
  winning_numbers integer[],
  method text not null default 'random' check (method in ('random', 'algorithmic')),
  status text not null default 'pending' check (status in ('pending','published','cancelled')),
  total_pool numeric(10,2),
  five_match_pool numeric(10,2),
  four_match_pool numeric(10,2),
  three_match_pool numeric(10,2),
  winner_count integer default 0,
  participants_count integer default 0,
  jackpot_rollover numeric(10,2) default 0,
  jackpot_rollover_in numeric(10,2) default 0,
  admin_notes text,
  published_at timestamptz,
  executed_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- ── Draw Results ──────────────────────────────────────────────
create table draw_results (
  id uuid primary key default uuid_generate_v4(),
  draw_id uuid not null references draws(id),
  user_id uuid not null references users(id),
  match_type text not null check (match_type in ('5-match', '4-match', '3-match')),
  matched_numbers integer[],
  prize_amount numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending','under_review','approved','rejected','paid')),
  proof_url text,
  proof_submitted_at timestamptz,
  admin_note text,
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  paid_at timestamptz,
  payment_reference text,
  created_at timestamptz not null default now()
);
create index idx_draw_results_user on draw_results(user_id);
create index idx_draw_results_draw on draw_results(draw_id);
create index idx_draw_results_status on draw_results(status);

-- ── Notifications ─────────────────────────────────────────────
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('draw_result','winner_approved','winner_rejected','payment_received','subscription_expiring','admin_message','score_reminder','credit_granted')),
  title text not null,
  message text not null,
  is_read boolean not null default false,
  reference_id uuid,
  reference_type text,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on notifications(user_id);
create index idx_notifications_unread on notifications(user_id, is_read);

-- ── Admin Audit Log ───────────────────────────────────────────
create table admin_logs (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid not null references users(id),
  action text not null,
  target_type text,
  target_id uuid,
  before_data jsonb,
  after_data jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);
create index idx_admin_logs_admin on admin_logs(admin_id);

-- ── FK: users → charities ─────────────────────────────────────
alter table users add constraint fk_users_charity
  foreign key (charity_id) references charities(id);

-- ── Seed: Prize pool config ───────────────────────────────────
insert into prize_pool_config (five_match_pct, four_match_pct, three_match_pct, subscription_pool_pct, charity_min_pct, monthly_price, yearly_price)
values (40.00, 35.00, 25.00, 60.00, 10.00, 29.99, 299.99);

-- ── Seed: Admin user  (password: Admin@1234) ─────────────────
insert into users (email, password_hash, full_name, role)
values ('admin@golfcharity.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCkJ9mGq2LjJfj8Kc5CqC3y', 'Platform Admin', 'admin');

-- ── Seed: Charities ───────────────────────────────────────────
insert into charities (name, description, long_description, category, website, is_featured, sort_order) values
('Cancer Research UK', 'Fighting cancer through world-class research across every type of cancer.', 'Cancer Research UK is the world''s leading independent cancer charity. We fund over half of all cancer research in the UK.', 'Health', 'https://www.cancerresearchuk.org', true, 1),
('British Heart Foundation', 'Funding pioneering research to beat heart and circulatory diseases.', 'The British Heart Foundation is the UK''s largest independent funder of cardiovascular research.', 'Health', 'https://www.bhf.org.uk', true, 2),
('Age UK', 'Supporting older people to live their best lives.', 'Age UK is the country''s leading charity helping people make the most of later life.', 'Community', 'https://www.ageuk.org.uk', false, 3),
('Macmillan Cancer Support', 'Medical, emotional, practical and financial support for people living with cancer.', 'Macmillan Cancer Support improves the lives of people affected by cancer.', 'Health', 'https://www.macmillan.org.uk', false, 4),
('Alzheimer''s Society', 'United against dementia through campaigning, research and vital support.', 'Alzheimer''s Society is the UK''s leading dementia charity.', 'Health', 'https://www.alzheimers.org.uk', false, 5);

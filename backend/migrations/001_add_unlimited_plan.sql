-- Migration: Add 'unlimited' plan support to subscriptions
-- This script updates the subscription plan constraint to allow 'unlimited' plan

-- Drop the old constraint
ALTER TABLE subscriptions DROP CONSTRAINT subscriptions_plan_check;

-- Add the new constraint with 'unlimited' support
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check 
  CHECK (plan in ('monthly', 'yearly', 'unlimited'));

import express from 'express';
import supabase from '../utils/supabase.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { generateDrawNumbers, simulateDraw, executeDraw, getPoolConfig } from '../services/drawEngine.js';

const router = express.Router();
router.use(authenticate, requireAdmin);

// Audit helper
async function audit(adminId, action, targetType, targetId, before, after, ip) {
  supabase.from('admin_logs').insert({ admin_id: adminId, action, target_type: targetType, target_id: targetId || null, before_data: before || null, after_data: after || null, ip_address: ip || null }).then(() => {}).catch(() => {});
}

/* ── Stats ─────────────────────────────────────────────────── */
router.get('/stats', async (req, res, next) => {
  try {
    const [
      { count: totalUsers },
      { count: activeSubs },
      { count: pendingVerifications },
      { count: totalSessions },
      { data: subRevenue },
      { data: charityTotals },
      { data: lastDraw },
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).neq('role', 'admin'),
      supabase.from('subscriptions').select('id, users(role)', { count: 'exact', head: true }).eq('status', 'active').neq('users.role', 'admin'),
      supabase.from('draw_results').select('id', { count: 'exact', head: true }).eq('status', 'under_review'),
      supabase.from('score_sessions').select('id', { count: 'exact', head: true }).eq('is_complete', true),
      supabase.from('subscriptions').select('plan, users(role)').eq('status', 'active').neq('users.role', 'admin'),
      supabase.from('charity_contributions').select('amount'),
      supabase.from('draws').select('jackpot_rollover').eq('status', 'published').order('draw_date', { ascending: false }).limit(1),
    ]);

    let monthlyRevenue = 0;
    subRevenue?.forEach(({ plan }) => { monthlyRevenue += plan === 'monthly' ? 29.99 : 299.99 / 12; });
    const totalCharity = charityTotals?.reduce((s, c) => s + Number(c.amount), 0) || 0;

    res.json({
      totalUsers: totalUsers || 0,
      activeSubscriptions: activeSubs || 0,
      pendingVerifications: pendingVerifications || 0,
      totalScoreSessions: totalSessions || 0,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      estimatedPrizePool: Math.round(monthlyRevenue * 0.6 * 100) / 100,
      jackpotRollover: lastDraw?.[0]?.jackpot_rollover || 0,
      totalCharityContributed: Math.round(totalCharity * 100) / 100,
    });
  } catch (err) { next(err); }
});

/* ── Users ─────────────────────────────────────────────────── */
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 25, search, role } = req.query;
    const offset = (page - 1) * limit;

    let q = supabase.from('users')
      .select('id, email, full_name, role, is_active, credits, total_credits_earned, handicap, created_at, last_login_at, last_score_submission_date, total_score_submissions, charity_id, subscriptions(status, plan, current_period_end)', { count: 'exact' })
      .neq('role', 'admin')
      .order('created_at', { ascending: false })
      .range(offset, offset + +limit - 1);

    if (search) q = q.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    if (role) q = q.eq('role', role);

    const { data, count, error } = await q;
    if (error) throw error;
    res.json({ users: data, total: count, page: +page, limit: +limit });
  } catch (err) { next(err); }
});

// Full user detail
router.get('/users/:id', async (req, res, next) => {
  try {
    const { data: user } = await supabase.from('users').select('*, subscriptions(*)').eq('id', req.params.id).single();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [
      { data: scores },
      { data: winnings },
      { data: credits },
      { data: sessions },
    ] = await Promise.all([
      supabase.from('scores').select('*, score_sessions(submitted_at, is_complete)').eq('user_id', req.params.id).order('played_at', { ascending: false }).limit(20),
      supabase.from('draw_results').select('*, draws(draw_date, winning_numbers)').eq('user_id', req.params.id).order('created_at', { ascending: false }),
      supabase.from('credit_transactions').select('*').eq('user_id', req.params.id).order('created_at', { ascending: false }).limit(30),
      supabase.from('score_sessions').select('*').eq('user_id', req.params.id).order('submitted_at', { ascending: false }).limit(10),
    ]);

    res.json({ user: { ...user, password_hash: undefined }, scores, winnings, credits, sessions });
  } catch (err) { next(err); }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const { is_active, role, handicap, phone, charity_percentage } = req.body;
    const { data: before } = await supabase.from('users').select('*').eq('id', req.params.id).single();

    const updates = { updated_at: new Date().toISOString() };
    if (is_active !== undefined) updates.is_active = is_active;
    if (role) updates.role = role;
    if (handicap !== undefined) updates.handicap = handicap;
    if (phone !== undefined) updates.phone = phone;
    if (charity_percentage !== undefined) updates.charity_percentage = charity_percentage;

    const { data, error } = await supabase.from('users').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;

    await audit(req.user.id, 'update_user', 'user', req.params.id, before, data, req.ip);
    res.json({ user: data });
  } catch (err) { next(err); }
});

/* ── Credits ────────────────────────────────────────────────── */
router.post('/users/:id/credits', async (req, res, next) => {
  try {
    const { amount, description } = req.body;
    if (!amount || isNaN(amount)) return res.status(400).json({ error: 'amount is required' });
    if (!description?.trim()) return res.status(400).json({ error: 'description is required' });

    const n = parseInt(amount);

    // Get current balance
    const { data: user } = await supabase.from('users').select('credits, total_credits_earned').eq('id', req.params.id).single();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const currentCredits = Number.isFinite(user.credits) ? Number(user.credits) : 0;
    const currentTotalEarned = Number.isFinite(user.total_credits_earned) ? Number(user.total_credits_earned) : 0;
    const newBalance = currentCredits + n;
    if (newBalance < 0) return res.status(400).json({ error: 'Would result in negative balance' });

    const newTotal = n > 0 ? currentTotalEarned + n : currentTotalEarned;

    await supabase.from('users').update({ credits: newBalance, total_credits_earned: newTotal, updated_at: new Date().toISOString() }).eq('id', req.params.id);

    const { data: tx } = await supabase.from('credit_transactions').insert({
      user_id: req.params.id,
      amount: n,
      balance_after: newBalance,
      type: n > 0 ? 'admin_grant' : 'admin_deduct',
      description,
      granted_by: req.user.id,
    }).select().single();

    // Notify user
    await supabase.from('notifications').insert({
      user_id: req.params.id, type: 'credit_granted',
      title: n > 0 ? `${n} credits added to your account` : `${Math.abs(n)} credits deducted`,
      message: description,
    });

    await audit(req.user.id, n > 0 ? 'grant_credits' : 'deduct_credits', 'user', req.params.id, { balance: user.credits }, { balance: newBalance, amount: n, description }, req.ip);
    res.json({ balance: newBalance, transaction: tx });
  } catch (err) { next(err); }
});

/* ── Score management ───────────────────────────────────────── */
router.get('/users/:id/scores', async (req, res, next) => {
  try {
    const { data } = await supabase.from('scores').select('*, score_sessions(submitted_at, is_complete)').eq('user_id', req.params.id).order('played_at', { ascending: false });
    res.json({ scores: data || [] });
  } catch (err) { next(err); }
});

router.put('/scores/:id', async (req, res, next) => {
  try {
    const { score, played_at, course_name } = req.body;
    const { data: before } = await supabase.from('scores').select('*').eq('id', req.params.id).single();
    const updates = { updated_at: new Date().toISOString() };
    if (score !== undefined) updates.score = score;
    if (played_at) updates.played_at = played_at;
    if (course_name !== undefined) updates.course_name = course_name;

    const { data, error } = await supabase.from('scores').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    await audit(req.user.id, 'edit_score', 'score', req.params.id, before, data, req.ip);
    res.json({ score: data });
  } catch (err) { next(err); }
});

router.delete('/scores/:id', async (req, res, next) => {
  try {
    const { data: before } = await supabase.from('scores').select('*').eq('id', req.params.id).single();
    await supabase.from('scores').delete().eq('id', req.params.id);
    await audit(req.user.id, 'delete_score', 'score', req.params.id, before, null, req.ip);
    res.json({ message: 'Score deleted' });
  } catch (err) { next(err); }
});

/* ── Subscriptions ─────────────────────────────────────────── */
router.patch('/subscriptions/:id', async (req, res, next) => {
  try {
    const { status, cancel_reason, plan } = req.body;
    const { data: before } = await supabase.from('subscriptions').select('*').eq('id', req.params.id).single();
    const updates = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (cancel_reason) updates.cancel_reason = cancel_reason;
    if (status === 'cancelled') updates.cancelled_at = new Date().toISOString();
    if (plan && ['monthly', 'yearly', 'unlimited'].includes(plan)) updates.plan = plan;

    const { data, error } = await supabase.from('subscriptions').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;

    await supabase.from('subscription_history').insert({ user_id: data.user_id, subscription_id: req.params.id, event: status || 'updated', plan: data.plan, metadata: { reason: cancel_reason, previous_plan: before.plan } });
    await audit(req.user.id, 'update_subscription', 'subscription', req.params.id, before, data, req.ip);
    res.json({ subscription: data });
  } catch (err) { next(err); }
});

/* ── Activate/Deactivate User Subscription ───────────────── */
router.post('/users/:id/subscription/activate', async (req, res, next) => {
  try {
    const { plan = 'monthly', current_period_end } = req.body;
    if (!['monthly', 'yearly'].includes(plan)) return res.status(400).json({ error: 'plan must be monthly or yearly' });

    const { data: user } = await supabase.from('users').select('id').eq('id', req.params.id).single();
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check if subscription exists
    const { data: existing } = await supabase.from('subscriptions').select('id, status').eq('user_id', req.params.id).eq('status', 'active').single();
    if (existing) return res.status(400).json({ error: 'User already has active subscription' });

    const periodEnd = current_period_end || new Date(Date.now() + (plan === 'monthly' ? 30 * 24 * 60 * 60 * 1000 : 365 * 24 * 60 * 60 * 1000)).toISOString();

    const { data: sub, error } = await supabase.from('subscriptions').insert({
      user_id: req.params.id,
      plan,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd,
    }).select().single();

    if (error) throw error;

    await supabase.from('notifications').insert({
      user_id: req.params.id,
      type: 'subscription_activated',
      title: 'Subscription Activated by Admin',
      message: `Your ${plan} subscription has been activated by an administrator.`,
    });

    await audit(req.user.id, 'activate_subscription', 'subscription', sub.id, null, sub, req.ip);
    res.status(201).json({ subscription: sub });
  } catch (err) { next(err); }
});

router.post('/users/:id/subscription/deactivate', async (req, res, next) => {
  try {
    const { reason = 'Admin action' } = req.body;

    const { data: sub, error: e } = await supabase.from('subscriptions').select('id, status').eq('user_id', req.params.id).eq('status', 'active').single();
    if (e || !sub) return res.status(404).json({ error: 'No active subscription found' });

    const { data, error } = await supabase.from('subscriptions').update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason,
      updated_at: new Date().toISOString(),
    }).eq('id', sub.id).select().single();

    if (error) throw error;

    await supabase.from('notifications').insert({
      user_id: req.params.id,
      type: 'subscription_cancelled',
      title: 'Subscription Cancelled by Admin',
      message: `Your subscription has been cancelled by an administrator. Reason: ${reason}`,
    });

    await audit(req.user.id, 'deactivate_subscription', 'subscription', sub.id, { status: 'active' }, data, req.ip);
    res.json({ subscription: data });
  } catch (err) { next(err); }
});

/* ── Fund/Money Management ──────────────────────────────────── */
router.post('/users/:id/funds', async (req, res, next) => {
  try {
    const { amount, description, transaction_type = 'admin_credit' } = req.body;
    if (amount === undefined || amount === null || isNaN(amount)) return res.status(400).json({ error: 'amount is required' });
    if (!description?.trim()) return res.status(400).json({ error: 'description is required' });

    const n = parseInt(amount, 10);
    if (isNaN(n)) return res.status(400).json({ error: 'amount must be an integer' });
    if (n === 0) return res.status(400).json({ error: 'amount cannot be zero' });

    const { data: user } = await supabase.from('users').select('id, credits, total_credits_earned').eq('id', req.params.id).single();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const currentCredits = Number.isFinite(user.credits) ? Number(user.credits) : 0;
    const newBalance = currentCredits + n;
    if (!Number.isFinite(newBalance)) return res.status(500).json({ error: 'Unable to calculate new balance' });
    if (newBalance < 0) return res.status(400).json({ error: 'Would result in negative balance' });

    const { data: tx, error } = await supabase.from('credit_transactions').insert({
      user_id: req.params.id,
      amount: n,
      balance_after: newBalance,
      type: n > 0 ? 'admin_grant' : 'admin_deduct',
      description: `[FUND] ${description}`,
      granted_by: req.user.id,
    }).select().single();
    if (error) throw error;

    await supabase.from('users').update({ credits: newBalance, updated_at: new Date().toISOString() }).eq('id', req.params.id);

    await supabase.from('notifications').insert({
      user_id: req.params.id,
      type: 'fund_transaction',
      title: n > 0 ? `₹${Math.abs(n).toFixed(2)} credited to your account` : `₹${Math.abs(n).toFixed(2)} debited from your account`,
      message: description,
    });

    await audit(req.user.id, `fund_${n > 0 ? 'credit' : 'debit'}`, 'user', req.params.id, { credits: user.credits }, { amount: n, balance_after: newBalance, description }, req.ip);
    res.json({ transaction: tx });
  } catch (err) { next(err); }
});

/* ── Unlimited Tier Management ──────────────────────────────── */
router.post('/users/:id/unlimited', async (req, res, next) => {
  try {
    const { enable = true } = req.body;

    const { data: before } = await supabase.from('users').select('*').eq('id', req.params.id).single();
    if (!before) return res.status(404).json({ error: 'User not found' });

    // If enabling unlimited, create an "unlimited" subscription
    if (enable) {
      const { data: existing } = await supabase.from('subscriptions').select('id').eq('user_id', req.params.id).eq('status', 'active').single();
      if (!existing) {
        const { data: sub, error } = await supabase.from('subscriptions').insert({
          user_id: req.params.id,
          plan: 'unlimited',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(), // Far future
        }).select().single();
        if (error) throw error;
      }

      await supabase.from('notifications').insert({
        user_id: req.params.id,
        type: 'unlimited_enabled',
        title: 'Unlimited Tier Activated',
        message: 'You now have unlimited access to all features!',
      });

      await audit(req.user.id, 'enable_unlimited', 'user', req.params.id, before, { unlimited: true }, req.ip);
      res.json({ message: 'Unlimited tier enabled', unlimited: true });
    } else {
      // Disable unlimited by cancelling subscription
      await supabase.from('subscriptions').update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      }).eq('user_id', req.params.id).eq('status', 'active');

      await audit(req.user.id, 'disable_unlimited', 'user', req.params.id, { unlimited: true }, before, req.ip);
      res.json({ message: 'Unlimited tier disabled', unlimited: false });
    }
  } catch (err) { next(err); }
});

/* ── Draws ─────────────────────────────────────────────────── */
router.get('/draws', async (req, res, next) => {
  try {
    const { data } = await supabase.from('draws').select('*').order('draw_date', { ascending: false });
    res.json({ draws: data || [] });
  } catch (err) { next(err); }
});

router.post('/draws/simulate', async (req, res, next) => {
  try {
    const result = await simulateDraw(req.body.method || 'random');
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/draws/create', async (req, res, next) => {
  try {
    const { draw_date, method = 'random', admin_notes } = req.body;
    if (!draw_date) return res.status(400).json({ error: 'draw_date required (YYYY-MM-DD)' });

    const draw_month = draw_date.slice(0, 7);
    const winning_numbers = await generateDrawNumbers(method);

    const { data: lastDraw } = await supabase.from('draws').select('jackpot_rollover').eq('status', 'published').order('draw_date', { ascending: false }).limit(1).single();
    const rolloverIn = lastDraw?.jackpot_rollover || 0;

    const { data, error } = await supabase.from('draws').insert({ draw_date, draw_month, winning_numbers, method, status: 'pending', jackpot_rollover_in: rolloverIn, admin_notes }).select().single();
    if (error) throw error;

    await audit(req.user.id, 'create_draw', 'draw', data.id, null, data, req.ip);
    res.status(201).json({ draw: data });
  } catch (err) { next(err); }
});

router.patch('/draws/:id', async (req, res, next) => {
  try {
    const { draw_date, method, admin_notes, status } = req.body;
    const updates = {};
    if (draw_date) { updates.draw_date = draw_date; updates.draw_month = draw_date.slice(0, 7); }
    if (method) { updates.method = method; updates.winning_numbers = await generateDrawNumbers(method); }
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;
    if (status) updates.status = status;

    const { data, error } = await supabase.from('draws').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ draw: data });
  } catch (err) { next(err); }
});

router.post('/draws/:id/execute', async (req, res, next) => {
  try {
    const result = await executeDraw(req.params.id, req.user.id);
    await audit(req.user.id, 'execute_draw', 'draw', req.params.id, null, { participants: result.participants, winners: result.winners }, req.ip);
    res.json({ message: 'Draw executed and published', ...result });
  } catch (err) { next(err); }
});

/* ── Winners ─────────────────────────────────────────────────  */
router.get('/winners', async (req, res, next) => {
  try {
    const { status, page = 1, limit = 25 } = req.query;
    const offset = (page - 1) * limit;

    let q = supabase.from('draw_results')
      .select('*, users(id, email, full_name), draws(draw_date, draw_month, winning_numbers)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + +limit - 1);
    if (status) q = q.eq('status', status);

    const { data, count } = await q;
    res.json({ winners: data || [], total: count, page: +page });
  } catch (err) { next(err); }
});

router.patch('/winners/:id', async (req, res, next) => {
  try {
    const { action, admin_note, payment_reference } = req.body;
    const statusMap = { approve: 'approved', reject: 'rejected', mark_paid: 'paid' };
    if (!statusMap[action]) return res.status(400).json({ error: 'action must be: approve | reject | mark_paid' });

    const { data: before } = await supabase.from('draw_results').select('*').eq('id', req.params.id).single();
    const updates = { status: statusMap[action], reviewed_by: req.user.id, reviewed_at: new Date().toISOString() };
    if (admin_note) updates.admin_note = admin_note;
    if (action === 'mark_paid') { updates.paid_at = new Date().toISOString(); if (payment_reference) updates.payment_reference = payment_reference; }

    const { data, error } = await supabase.from('draw_results').update(updates).eq('id', req.params.id).select('*, users(id, email, full_name)').single();
    if (error) throw error;

    // Notify user
    const notifMessages = {
      approve: { type: 'winner_approved', title: 'Your prize proof has been approved', message: `Your proof for ₹${Number(before.prize_amount).toFixed(2)} has been approved. Payment will be processed shortly.` },
      reject: { type: 'winner_rejected', title: 'Your prize proof was rejected', message: `Your proof was rejected. Reason: ${admin_note || 'Does not meet requirements'}. Please contact support.` },
      mark_paid: { type: 'payment_received', title: 'Your prize has been paid!', message: `Your prize of ₹${Number(before.prize_amount).toFixed(2)} has been paid. Reference: ${payment_reference || 'N/A'}` },
    };
    await supabase.from('notifications').insert({ user_id: before.user_id, reference_id: req.params.id, reference_type: 'draw_result', ...notifMessages[action] });

    await audit(req.user.id, `winner_${action}`, 'draw_result', req.params.id, before, data, req.ip);
    res.json({ result: data });
  } catch (err) { next(err); }
});

/* ── Charities ─────────────────────────────────────────────── */
router.get('/charities', async (req, res, next) => {
  try {
    const { data } = await supabase.from('charities').select('*').order('sort_order').order('name');
    res.json({ charities: data || [] });
  } catch (err) { next(err); }
});

router.post('/charities', async (req, res, next) => {
  try {
    const { name, description, long_description, category, website, registration_number, logo_url, banner_url, is_featured, sort_order } = req.body;
    if (!name || !description) return res.status(400).json({ error: 'name and description required' });

    const { data, error } = await supabase.from('charities').insert({ name, description, long_description, category, website, registration_number, logo_url, banner_url, is_featured: !!is_featured, sort_order: sort_order || 99, is_active: true }).select().single();
    if (error) throw error;
    await audit(req.user.id, 'create_charity', 'charity', data.id, null, data, req.ip);
    res.status(201).json({ charity: data });
  } catch (err) { next(err); }
});

router.put('/charities/:id', async (req, res, next) => {
  try {
    const allowed = ['name', 'description', 'long_description', 'category', 'website', 'registration_number', 'logo_url', 'banner_url', 'is_featured', 'is_active', 'sort_order'];
    const updates = { updated_at: new Date().toISOString() };
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const { data, error } = await supabase.from('charities').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    await audit(req.user.id, 'update_charity', 'charity', req.params.id, null, data, req.ip);
    res.json({ charity: data });
  } catch (err) { next(err); }
});

// Charity events
router.post('/charities/:id/events', async (req, res, next) => {
  try {
    const { title, description, event_date, location, registration_url } = req.body;
    if (!title || !event_date) return res.status(400).json({ error: 'title and event_date required' });
    const { data, error } = await supabase.from('charity_events').insert({ charity_id: req.params.id, title, description, event_date, location, registration_url }).select().single();
    if (error) throw error;
    res.status(201).json({ event: data });
  } catch (err) { next(err); }
});

router.delete('/charities/:cid/events/:eid', async (req, res, next) => {
  try {
    await supabase.from('charity_events').delete().eq('id', req.params.eid).eq('charity_id', req.params.cid);
    res.json({ message: 'Event deleted' });
  } catch (err) { next(err); }
});

/* ── Prize Pool Config ─────────────────────────────────────── */
router.get('/config/prize-pool', async (req, res, next) => {
  try {
    const cfg = await getPoolConfig();
    res.json({ config: cfg });
  } catch (err) { next(err); }
});

router.put('/config/prize-pool', async (req, res, next) => {
  try {
    const { five_match_pct, four_match_pct, three_match_pct, subscription_pool_pct, charity_min_pct, monthly_price, yearly_price } = req.body;
    const sum = +five_match_pct + +four_match_pct + +three_match_pct;
    if (Math.abs(sum - 100) > 0.01) return res.status(400).json({ error: `Match percentages must sum to 100 (got ${sum})` });

    const { data: cfg } = await supabase.from('prize_pool_config').select('id').eq('is_active', true).single();
    const { data, error } = await supabase.from('prize_pool_config').update({ five_match_pct, four_match_pct, three_match_pct, subscription_pool_pct, charity_min_pct, monthly_price, yearly_price, updated_by: req.user.id, updated_at: new Date().toISOString() }).eq('id', cfg.id).select().single();
    if (error) throw error;
    await audit(req.user.id, 'update_prize_config', 'config', cfg.id, null, data, req.ip);
    res.json({ config: data });
  } catch (err) { next(err); }
});

/* ── Notifications broadcast ───────────────────────────────── */
router.post('/notifications/broadcast', async (req, res, next) => {
  try {
    const { title, message, user_ids } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'title and message required' });

    let targetIds = user_ids;
    if (!targetIds?.length) {
      const { data: subs } = await supabase.from('subscriptions').select('user_id').eq('status', 'active');
      targetIds = subs?.map(s => s.user_id) || [];
    }

    const notifs = targetIds.map(uid => ({ user_id: uid, type: 'admin_message', title, message }));
    await supabase.from('notifications').insert(notifs);
    await audit(req.user.id, 'broadcast_notification', 'notification', null, null, { title, recipients: notifs.length }, req.ip);
    res.json({ message: `Sent to ${notifs.length} users` });
  } catch (err) { next(err); }
});

/* ── Reports ───────────────────────────────────────────────── */
router.get('/reports/overview', async (req, res, next) => {
  try {
    const { data: subs } = await supabase.from('subscriptions').select('plan').eq('status', 'active');
    const { data: draws } = await supabase.from('draws').select('total_pool, winner_count, participants_count, draw_month').eq('status', 'published').order('draw_date', { ascending: false }).limit(12);
    const { data: contribs } = await supabase.from('charity_contributions').select('amount, charities(name)');

    const charityTotals = {};
    contribs?.forEach(c => {
      const n = c.charities?.name || 'Unknown';
      charityTotals[n] = (charityTotals[n] || 0) + Number(c.amount);
    });

    res.json({
      subscriptionsByPlan: { monthly: subs?.filter(s => s.plan === 'monthly').length || 0, yearly: subs?.filter(s => s.plan === 'yearly').length || 0 },
      totalContributions: contribs?.reduce((s, c) => s + Number(c.amount), 0) || 0,
      charityLeaderboard: Object.entries(charityTotals).sort((a, b) => b[1] - a[1]).slice(0, 10),
      drawHistory: draws || [],
    });
  } catch (err) { next(err); }
});

router.get('/reports/charity-contributions', async (req, res, next) => {
  try {
    const { data } = await supabase.from('charity_contributions').select('*, charities(name), users(email, full_name)').order('created_at', { ascending: false }).limit(100);
    res.json({ contributions: data || [] });
  } catch (err) { next(err); }
});

/* ── Audit Log ─────────────────────────────────────────────── */
router.get('/audit-log', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action, target_type } = req.query;
    const offset = (page - 1) * limit;

    let q = supabase.from('admin_logs')
      .select('*, users!admin_logs_admin_id_fkey(email, full_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + +limit - 1);
    if (action) q = q.eq('action', action);
    if (target_type) q = q.eq('target_type', target_type);

    const { data, count } = await q;
    res.json({ logs: data || [], total: count, page: +page });
  } catch (err) { next(err); }
});

export default router;

import express from 'express';
import supabase from '../utils/supabase.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require admin role
router.use(authenticate, requireAdmin);

// GET /api/admin/stats — dashboard overview
router.get('/stats', async (req, res, next) => {
  try {
    const [
      { count: totalUsers },
      { count: activeSubscriptions },
      { data: subscriptionRevenue },
      { data: charityContributions },
      { count: pendingVerifications },
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('subscriptions').select('plan').eq('status', 'active'),
      supabase.from('charity_contributions').select('amount'),
      supabase.from('draw_results').select('id', { count: 'exact', head: true }).eq('status', 'under_review'),
    ]);

    let monthlyRevenue = 0;
    subscriptionRevenue?.forEach(({ plan }) => {
      monthlyRevenue += plan === 'monthly' ? 29.99 : 299.99 / 12;
    });

    const totalCharity = charityContributions?.reduce((sum, c) => sum + c.amount, 0) || 0;
    const estimatedPrizePool = monthlyRevenue * 0.6;

    res.json({
      totalUsers: totalUsers || 0,
      activeSubscriptions: activeSubscriptions || 0,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      estimatedPrizePool: Math.round(estimatedPrizePool * 100) / 100,
      totalCharityContributed: Math.round(totalCharity * 100) / 100,
      pendingVerifications: pendingVerifications || 0,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users — paginated user list
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select(`
        id, email, full_name, role, is_active, created_at, handicap,
        subscriptions(status, plan, current_period_end)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({ users: data, total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id — update user (toggle active, change role)
router.patch('/users/:id', async (req, res, next) => {
  try {
    const { is_active, role, handicap } = req.body;
    const updates = {};
    if (is_active !== undefined) updates.is_active = is_active;
    if (role) updates.role = role;
    if (handicap !== undefined) updates.handicap = handicap;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ user: data });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users/:id/scores — admin view user scores
router.get('/users/:id/scores', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .eq('user_id', req.params.id)
      .order('played_at', { ascending: false });
    if (error) throw error;
    res.json({ scores: data });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/scores/:id — admin edit any score
router.put('/scores/:id', async (req, res, next) => {
  try {
    const { score, played_at, course_name } = req.body;
    const updates = {};
    if (score) updates.score = score;
    if (played_at) updates.played_at = played_at;
    if (course_name !== undefined) updates.course_name = course_name;

    const { data, error } = await supabase
      .from('scores')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ score: data });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/winners — all draw results with user info
router.get('/winners', async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from('draw_results')
      .select(`
        id, match_type, prize_amount, status, proof_url, created_at,
        users(id, email, full_name),
        draws(draw_date, winning_numbers)
      `)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ winners: data });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/winners/:id — verify or reject winner proof
router.patch('/winners/:id', async (req, res, next) => {
  try {
    const { action, admin_note } = req.body; // action: 'approve' | 'reject' | 'mark_paid'
    const statusMap = { approve: 'approved', reject: 'rejected', mark_paid: 'paid' };

    if (!statusMap[action]) return res.status(400).json({ error: 'Invalid action' });

    const { data, error } = await supabase
      .from('draw_results')
      .update({
        status: statusMap[action],
        admin_note: admin_note || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ result: data });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/draws — all draws (including pending)
router.get('/draws', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('draws')
      .select('*')
      .order('draw_date', { ascending: false });
    if (error) throw error;
    res.json({ draws: data });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/charities — all charities including inactive
router.get('/charities', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('charities')
      .select('*')
      .order('name');
    if (error) throw error;
    res.json({ charities: data });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/reports/charity-contributions
router.get('/reports/charity-contributions', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('charity_contributions')
      .select(`
        amount, type, created_at,
        charities(name),
        users(email, full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json({ contributions: data });
  } catch (err) {
    next(err);
  }
});

export default router;

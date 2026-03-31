import express from 'express';
import supabase from '../utils/supabase.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { generateDrawNumbers, executeDraw, simulateDraw } from '../services/drawEngine.js';

const router = express.Router();

// GET /api/draws — list published draws (public)
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('draws')
      .select('id, draw_date, winning_numbers, total_pool, winner_count, jackpot_rollover, status, published_at')
      .eq('status', 'published')
      .order('draw_date', { ascending: false })
      .limit(12);

    if (error) throw error;
    res.json({ draws: data });
  } catch (err) {
    next(err);
  }
});

// GET /api/draws/upcoming — next scheduled draw info
router.get('/upcoming', async (req, res, next) => {
  try {
    const { data } = await supabase
      .from('draws')
      .select('id, draw_date, status')
      .eq('status', 'pending')
      .order('draw_date', { ascending: true })
      .limit(1)
      .single();

    // Get jackpot rollover from last published
    const { data: lastDraw } = await supabase
      .from('draws')
      .select('jackpot_rollover, total_pool')
      .eq('status', 'published')
      .order('draw_date', { ascending: false })
      .limit(1)
      .single();

    // Count active subscribers for prize estimate
    const { count } = await supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    res.json({
      nextDraw: data || null,
      estimatedPool: count ? count * 29.99 * 0.6 : 0,
      jackpotRollover: lastDraw?.jackpot_rollover || 0,
      activeSubscribers: count || 0,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/draws/my-results — logged-in user's draw winnings
router.get('/my-results', authenticate, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('draw_results')
      .select(`
        id, match_type, prize_amount, status, proof_url, created_at,
        draws(draw_date, winning_numbers)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ results: data });
  } catch (err) {
    next(err);
  }
});

// POST /api/draws/:id/upload-proof — winner uploads verification screenshot
router.post('/:id/upload-proof', authenticate, async (req, res, next) => {
  try {
    const { proof_url } = req.body;
    if (!proof_url) return res.status(400).json({ error: 'proof_url is required' });

    const { data: result } = await supabase
      .from('draw_results')
      .select('id, user_id, status')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (!result) return res.status(404).json({ error: 'Result not found' });
    if (result.status !== 'pending') return res.status(400).json({ error: 'Already processed' });

    await supabase.from('draw_results')
      .update({ proof_url, status: 'under_review' })
      .eq('id', req.params.id);

    res.json({ message: 'Proof submitted for review' });
  } catch (err) {
    next(err);
  }
});

// ── Admin draw routes ───────────────────────────────────────────────────────

// POST /api/draws/simulate — admin: preview draw without saving
router.post('/simulate', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { method = 'random' } = req.body;
    const result = await simulateDraw(method);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/draws/create — admin: create a new draw entry
router.post('/create', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { draw_date, method = 'random' } = req.body;
    if (!draw_date) return res.status(400).json({ error: 'draw_date required' });

    const winningNumbers = await generateDrawNumbers(method);

    const { data, error } = await supabase
      .from('draws')
      .insert({ draw_date, winning_numbers: winningNumbers, method, status: 'pending' })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ draw: data });
  } catch (err) {
    next(err);
  }
});

// POST /api/draws/:id/execute — admin: run and publish a draw
router.post('/:id/execute', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await executeDraw(req.params.id);
    res.json({ message: 'Draw executed and published', ...result });
  } catch (err) {
    next(err);
  }
});

export default router;

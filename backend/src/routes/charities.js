import express from 'express';
import { z } from 'zod';
import supabase from '../utils/supabase.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/charities — list all active charities (public)
router.get('/', async (req, res, next) => {
  try {
    const { search, category } = req.query;
    let query = supabase
      .from('charities')
      .select('id, name, description, logo_url, category, website, is_featured')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('name');

    if (search) query = query.ilike('name', `%${search}%`);
    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ charities: data });
  } catch (err) {
    next(err);
  }
});

// GET /api/charities/:id — single charity with events
router.get('/:id', async (req, res, next) => {
  try {
    const { data: charity, error } = await supabase
      .from('charities')
      .select('*')
      .eq('id', req.params.id)
      .eq('is_active', true)
      .single();

    if (error || !charity) return res.status(404).json({ error: 'Charity not found' });

    const { data: events } = await supabase
      .from('charity_events')
      .select('*')
      .eq('charity_id', req.params.id)
      .gte('event_date', new Date().toISOString())
      .order('event_date');

    // Get total contributed to this charity
    const { data: contributions } = await supabase
      .from('charity_contributions')
      .select('amount')
      .eq('charity_id', req.params.id);

    const totalContributed = contributions?.reduce((sum, c) => sum + c.amount, 0) || 0;

    res.json({ charity, events: events || [], totalContributed });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/charities/select — user selects their charity
router.patch('/select', authenticate, async (req, res, next) => {
  try {
    const { charity_id, charity_percentage } = req.body;

    const pct = charity_percentage || 10;
    if (pct < 10 || pct > 100) {
      return res.status(400).json({ error: 'Charity percentage must be between 10 and 100' });
    }

    const { data: charity } = await supabase
      .from('charities')
      .select('id')
      .eq('id', charity_id)
      .eq('is_active', true)
      .single();

    if (!charity) return res.status(404).json({ error: 'Charity not found' });

    await supabase.from('users')
      .update({ charity_id, charity_percentage: pct })
      .eq('id', req.user.id);

    res.json({ message: 'Charity selection saved' });
  } catch (err) {
    next(err);
  }
});

// POST /api/charities/donate — independent donation (not tied to subscription)
router.post('/donate', authenticate, async (req, res, next) => {
  try {
    const { charity_id, amount } = req.body;
    if (!charity_id || !amount || amount < 1) {
      return res.status(400).json({ error: 'charity_id and amount (min ₹1) required' });
    }

    const { data, error } = await supabase
      .from('charity_contributions')
      .insert({ user_id: req.user.id, charity_id, amount, type: 'direct' })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Donation recorded', contribution: data });
  } catch (err) {
    next(err);
  }
});

// ── Admin charity management ──────────────────────────────────────────────

const charitySchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  logo_url: z.string().url().optional(),
  category: z.string().optional(),
  website: z.string().url().optional(),
  is_featured: z.boolean().optional(),
});

router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const data = charitySchema.parse(req.body);
    const { data: charity, error } = await supabase
      .from('charities')
      .insert({ ...data, is_active: true })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ charity });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.errors });
    next(err);
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const data = charitySchema.partial().parse(req.body);
    const { data: updated, error } = await supabase
      .from('charities')
      .update(data)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ charity: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await supabase.from('charities').update({ is_active: false }).eq('id', req.params.id);
    res.json({ message: 'Charity deactivated' });
  } catch (err) {
    next(err);
  }
});

export default router;

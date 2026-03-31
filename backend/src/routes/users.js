import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import supabase from '../utils/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users/profile
router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, handicap, charity_id, charity_percentage, created_at, charities(id, name, logo_url)')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;
    res.json({ user: data });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/profile
router.patch('/profile', authenticate, async (req, res, next) => {
  try {
    const schema = z.object({
      full_name: z.string().min(2).optional(),
      handicap: z.number().optional(),
    });
    const data = schema.parse(req.body);

    const { data: updated, error } = await supabase
      .from('users')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', req.user.id)
      .select('id, email, full_name, handicap')
      .single();

    if (error) throw error;
    res.json({ user: updated });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.errors });
    next(err);
  }
});

// POST /api/users/change-password
router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'current_password and new_password required' });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', req.user.id)
      .single();

    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(new_password, 12);
    await supabase.from('users').update({ password_hash: newHash }).eq('id', req.user.id);

    // Invalidate all refresh tokens
    await supabase.from('refresh_tokens').delete().eq('user_id', req.user.id);

    res.json({ message: 'Password changed. Please log in again.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/dashboard — all data for user dashboard in one call
router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [
      { data: user },
      { data: subscription },
      { data: scores },
      { data: winnings },
      { data: upcomingDraw },
    ] = await Promise.all([
      supabase.from('users').select('*, charities(id, name, logo_url)').eq('id', userId).single(),
      supabase.from('subscriptions').select('*').eq('user_id', userId).eq('status', 'active').single(),
      supabase.from('scores').select('*').eq('user_id', userId).order('played_at', { ascending: false }).limit(5),
      supabase.from('draw_results').select('*, draws(draw_date, winning_numbers)').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('draws').select('id, draw_date').eq('status', 'pending').order('draw_date').limit(1).single(),
    ]);

    const totalWon = winnings?.filter(w => w.status === 'paid').reduce((sum, w) => sum + w.prize_amount, 0) || 0;

    res.json({
      user: { ...user, password_hash: undefined },
      subscription: subscription || null,
      scores: scores || [],
      winnings: winnings || [],
      totalWon,
      upcomingDraw: upcomingDraw || null,
      drawsEntered: subscription ? (winnings?.length || 0) : 0,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

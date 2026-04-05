import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import supabase from '../utils/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users/profile
router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('users')
      .select('id, email, full_name, handicap, charity_id, charity_percentage, credits, total_credits_earned, phone, avatar_url, created_at, last_score_submission_date, total_score_submissions, charities(id, name, logo_url)')
      .eq('id', req.user.id).single();
    if (error) throw error;
    res.json({ user: data });
  } catch (err) { next(err); }
});

// PATCH /api/users/profile
router.patch('/profile', authenticate, async (req, res, next) => {
  try {
    const body = z.object({ full_name: z.string().min(2).optional(), handicap: z.number().optional(), phone: z.string().optional(), avatar_url: z.string().optional() }).parse(req.body);
    const { data, error } = await supabase.from('users').update({ ...body, updated_at: new Date().toISOString() }).eq('id', req.user.id).select('id, email, full_name, handicap, phone, avatar_url').single();
    if (error) throw error;
    res.json({ user: data });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.errors });
    next(err);
  }
});

// POST /api/users/change-password
router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password || new_password.length < 8)
      return res.status(400).json({ error: 'new_password must be at least 8 characters' });

    const { data: u } = await supabase.from('users').select('password_hash').eq('id', req.user.id).single();
    if (!(await bcrypt.compare(current_password, u.password_hash)))
      return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(new_password, 12);
    await supabase.from('users').update({ password_hash: hash }).eq('id', req.user.id);
    await supabase.from('refresh_tokens').delete().eq('user_id', req.user.id);
    res.json({ message: 'Password changed. Please log in again.' });
  } catch (err) { next(err); }
});

// GET /api/users/dashboard — all data in one call
router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    const uid = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const [
      { data: user },
      { data: subscription },
      { data: scores },
      { data: todaySession },
      { data: winnings },
      { data: upcomingDraw },
      { data: notifications },
    ] = await Promise.all([
      supabase.from('users').select('*, charities(id, name, logo_url)').eq('id', uid).single(),
      supabase.from('subscriptions').select('*').eq('user_id', uid).eq('status', 'active').single(),
      supabase.from('scores').select('id, score, played_at, course_name').eq('user_id', uid).order('played_at', { ascending: false }).limit(5),
      supabase.from('score_sessions').select('*, scores(*)').eq('user_id', uid).eq('submitted_at', today).single(),
      supabase.from('draw_results').select('*, draws(draw_date, draw_month, winning_numbers)').eq('user_id', uid).order('created_at', { ascending: false }).limit(10),
      supabase.from('draws').select('id, draw_date, draw_month, jackpot_rollover_in').in('status', ['pending']).order('draw_date').limit(1).single(),
      supabase.from('notifications').select('id, type, title, message, is_read, created_at').eq('user_id', uid).eq('is_read', false).order('created_at', { ascending: false }).limit(5),
    ]);

    const totalWon = winnings?.filter(w => ['approved', 'paid'].includes(w.status)).reduce((s, w) => s + Number(w.prize_amount), 0) || 0;
    const submittedToday = todaySession?.is_complete || false;

    res.json({
      user: { ...user, password_hash: undefined },
      subscription: subscription || null,
      scores: scores || [],
      todaySession: todaySession || null,
      todayScores: todaySession?.scores || [],
      submittedToday,
      scoresEnteredToday: todaySession?.scores?.length || 0,
      winnings: winnings || [],
      totalWon,
      upcomingDraw: upcomingDraw || null,
      unreadNotifications: notifications || [],
    });
  } catch (err) { next(err); }
});

// PATCH /api/users/charity
router.patch('/charity', authenticate, async (req, res, next) => {
  try {
    const { charity_id, charity_percentage } = req.body;
    const pct = charity_percentage || 10;
    if (pct < 10 || pct > 100) return res.status(400).json({ error: 'charity_percentage must be 10–100' });
    const { data: charity } = await supabase.from('charities').select('id').eq('id', charity_id).eq('is_active', true).single();
    if (!charity) return res.status(404).json({ error: 'Charity not found' });
    await supabase.from('users').update({ charity_id, charity_percentage: pct }).eq('id', req.user.id);
    res.json({ message: 'Charity selection saved' });
  } catch (err) { next(err); }
});

// GET /api/users/credits
router.get('/credits', authenticate, async (req, res, next) => {
  try {
    const { data: u } = await supabase.from('users').select('credits, total_credits_earned').eq('id', req.user.id).single();
    const { data: history } = await supabase.from('credit_transactions').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(20);
    res.json({ credits: u?.credits || 0, totalEarned: u?.total_credits_earned || 0, history: history || [] });
  } catch (err) { next(err); }
});

export default router;

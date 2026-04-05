import express from 'express';
import { z } from 'zod';
import supabase from '../utils/supabase.js';
import { authenticate, requireSubscription } from '../middleware/auth.js';

const router = express.Router();

const scoreSchema = z.object({
  score: z.number().int().min(1).max(45),
  played_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  course_name: z.string().optional(),
});

const today = () => new Date().toISOString().split('T')[0];
const drawMonth = () => new Date().toISOString().slice(0, 7); // YYYY-MM

// GET /api/scores/today — today's session status + scores
router.get('/today', authenticate, requireSubscription, async (req, res, next) => {
  try {
    const { data: session } = await supabase
      .from('score_sessions')
      .select('*, scores(*)')
      .eq('user_id', req.user.id)
      .eq('submitted_at', today())
      .single();

    const { data: rollingScores } = await supabase
      .from('scores')
      .select('id, score, played_at, course_name, created_at')
      .eq('user_id', req.user.id)
      .order('played_at', { ascending: false })
      .limit(5);

    const todayScores = session?.scores || [];

    res.json({
      session: session || null,
      todayScores,
      rollingScores: rollingScores || [],
      sessionComplete: session?.is_complete || false,
      scoresEntered: todayScores.length,
      scoresNeeded: Math.max(0, 5 - todayScores.length),
      canSubmitMore: !session?.is_complete,
    });
  } catch (err) { next(err); }
});

// GET /api/scores — latest 5 rolling scores (used for draw matching)
router.get('/', authenticate, requireSubscription, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('id, score, played_at, course_name, created_at')
      .eq('user_id', req.user.id)
      .order('played_at', { ascending: false })
      .limit(5);
    if (error) throw error;
    res.json({ scores: data || [] });
  } catch (err) { next(err); }
});

// GET /api/scores/history — past completed sessions
router.get('/history', authenticate, requireSubscription, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const { data, count } = await supabase
      .from('score_sessions')
      .select('*, scores(*)', { count: 'exact' })
      .eq('user_id', req.user.id)
      .eq('is_complete', true)
      .order('submitted_at', { ascending: false })
      .range(offset, offset + +limit - 1);
    res.json({ sessions: data || [], total: count, page: +page });
  } catch (err) { next(err); }
});

// POST /api/scores — add one score to today's session (max 5/day)
router.post('/', authenticate, requireSubscription, async (req, res, next) => {
  try {
    const body = scoreSchema.parse(req.body);
    const t = today();

    // Get or create today's session
    let { data: session } = await supabase
      .from('score_sessions')
      .select('id, is_complete')
      .eq('user_id', req.user.id)
      .eq('submitted_at', t)
      .single();

    if (!session) {
      const { data: newSession, error: se } = await supabase
        .from('score_sessions')
        .insert({ user_id: req.user.id, submitted_at: t, draw_month: drawMonth() })
        .select('id, is_complete')
        .single();
      if (se) throw se;
      session = newSession;
    }

    if (session.is_complete) {
      return res.status(400).json({
        error: 'You have already submitted all 5 scores for today. Come back tomorrow!',
        code: 'SESSION_COMPLETE',
      });
    }

    // Count scores already in today's session
    const { count: currentCount } = await supabase
      .from('scores')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', session.id);

    if ((currentCount || 0) >= 5) {
      return res.status(400).json({ error: 'Already have 5 scores today.', code: 'MAX_SCORES' });
    }

    // Rolling window: keep only latest 5 total across all time
    const { data: allScores } = await supabase
      .from('scores')
      .select('id')
      .eq('user_id', req.user.id)
      .order('played_at', { ascending: true });

    if ((allScores?.length || 0) >= 5) {
      await supabase.from('scores').delete().eq('id', allScores[0].id);
    }

    // Insert new score
    const { data: newScore, error: insErr } = await supabase
      .from('scores')
      .insert({ user_id: req.user.id, session_id: session.id, score: body.score, played_at: body.played_at, course_name: body.course_name || null })
      .select()
      .single();
    if (insErr) throw insErr;

    const newCount = (currentCount || 0) + 1;
    const isComplete = newCount === 5;

    if (isComplete) {
      await supabase.from('score_sessions').update({ is_complete: true }).eq('id', session.id);
      // Update user stats
      const { data: u } = await supabase.from('users').select('total_score_submissions').eq('id', req.user.id).single();
      await supabase.from('users').update({
        last_score_submission_date: t,
        total_score_submissions: (u?.total_score_submissions || 0) + 1,
        updated_at: new Date().toISOString(),
      }).eq('id', req.user.id);
    } else {
      await supabase.from('users').update({ last_score_submission_date: t }).eq('id', req.user.id);
    }

    // Return updated today scores
    const { data: todayScores } = await supabase
      .from('scores')
      .select('id, score, played_at, course_name, created_at')
      .eq('session_id', session.id)
      .order('created_at');

    res.status(201).json({
      score: newScore,
      todayScores,
      scoresEntered: newCount,
      sessionComplete: isComplete,
      message: isComplete
        ? '🎉 All 5 scores submitted! You are entered into this month\'s draw.'
        : `Score ${newCount}/5 added. ${5 - newCount} more needed for full entry.`,
    });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.errors });
    next(err);
  }
});

// PUT /api/scores/:id — edit (only if today's session incomplete)
router.put('/:id', authenticate, requireSubscription, async (req, res, next) => {
  try {
    const body = scoreSchema.partial().parse(req.body);
    const { data: score } = await supabase.from('scores').select('id, user_id, session_id').eq('id', req.params.id).eq('user_id', req.user.id).single();
    if (!score) return res.status(404).json({ error: 'Score not found' });

    if (score.session_id) {
      const { data: sess } = await supabase.from('score_sessions').select('is_complete, submitted_at').eq('id', score.session_id).single();
      if (sess?.is_complete && sess.submitted_at !== today()) {
        return res.status(400).json({ error: 'Cannot edit scores from a completed past session' });
      }
    }

    const { data: updated } = await supabase.from('scores')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    res.json({ score: updated });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.errors });
    next(err);
  }
});

// DELETE /api/scores/:id — only from today's incomplete session
router.delete('/:id', authenticate, requireSubscription, async (req, res, next) => {
  try {
    const { data: score } = await supabase.from('scores').select('id, user_id, session_id').eq('id', req.params.id).eq('user_id', req.user.id).single();
    if (!score) return res.status(404).json({ error: 'Score not found' });

    if (score.session_id) {
      const { data: sess } = await supabase.from('score_sessions').select('is_complete').eq('id', score.session_id).single();
      if (sess?.is_complete) return res.status(400).json({ error: 'Cannot delete from a completed session' });
    }

    await supabase.from('scores').delete().eq('id', req.params.id);
    res.json({ message: 'Score deleted' });
  } catch (err) { next(err); }
});

export default router;

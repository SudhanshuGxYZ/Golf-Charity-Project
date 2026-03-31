import express from 'express';
import { z } from 'zod';
import supabase from '../utils/supabase.js';
import { authenticate, requireSubscription } from '../middleware/auth.js';

const router = express.Router();

const scoreSchema = z.object({
  score: z.number().int().min(1).max(45, 'Score must be between 1 and 45'),
  played_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  course_name: z.string().optional(),
});

// GET /api/scores — get current user's scores (latest 5, newest first)
router.get('/', authenticate, requireSubscription, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('id, score, played_at, course_name, created_at')
      .eq('user_id', req.user.id)
      .order('played_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    res.json({ scores: data });
  } catch (err) {
    next(err);
  }
});

// POST /api/scores — add new score, enforcing rolling 5-score window
router.post('/', authenticate, requireSubscription, async (req, res, next) => {
  try {
    const data = scoreSchema.parse(req.body);

    // Get current scores count
    const { data: existing, error: fetchError } = await supabase
      .from('scores')
      .select('id, played_at')
      .eq('user_id', req.user.id)
      .order('played_at', { ascending: true }); // oldest first for deletion

    if (fetchError) throw fetchError;

    // If already 5 scores, delete oldest before inserting
    if (existing && existing.length >= 5) {
      const oldestId = existing[0].id;
      await supabase.from('scores').delete().eq('id', oldestId);
    }

    const { data: newScore, error: insertError } = await supabase
      .from('scores')
      .insert({
        user_id: req.user.id,
        score: data.score,
        played_at: data.played_at,
        course_name: data.course_name || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Return updated list
    const { data: updatedScores } = await supabase
      .from('scores')
      .select('id, score, played_at, course_name, created_at')
      .eq('user_id', req.user.id)
      .order('played_at', { ascending: false })
      .limit(5);

    res.status(201).json({
      message: 'Score added successfully',
      score: newScore,
      scores: updatedScores,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
});

// PUT /api/scores/:id — edit a score
router.put('/:id', authenticate, requireSubscription, async (req, res, next) => {
  try {
    const data = scoreSchema.partial().parse(req.body);

    // Verify ownership
    const { data: existing } = await supabase
      .from('scores')
      .select('id, user_id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (!existing) return res.status(404).json({ error: 'Score not found' });

    const { data: updated, error } = await supabase
      .from('scores')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Score updated', score: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
});

// DELETE /api/scores/:id
router.delete('/:id', authenticate, requireSubscription, async (req, res, next) => {
  try {
    const { data: existing } = await supabase
      .from('scores')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (!existing) return res.status(404).json({ error: 'Score not found' });

    await supabase.from('scores').delete().eq('id', req.params.id);
    res.json({ message: 'Score deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;

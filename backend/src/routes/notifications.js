import express from 'express';
import supabase from '../utils/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const { data, count } = await supabase.from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + +limit - 1);
    const unreadCount = data?.filter(n => !n.is_read).length || 0;
    res.json({ notifications: data || [], total: count, unreadCount });
  } catch (err) { next(err); }
});

router.patch('/read-all', authenticate, async (req, res, next) => {
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', req.user.id).eq('is_read', false);
    res.json({ message: 'All marked read' });
  } catch (err) { next(err); }
});

router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('id', req.params.id).eq('user_id', req.user.id);
    res.json({ message: 'Marked read' });
  } catch (err) { next(err); }
});

export default router;

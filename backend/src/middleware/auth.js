import jwt from 'jsonwebtoken';
import supabase from '../utils/supabase.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify user still exists and is active
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role, is_active')
      .eq('id', decoded.userId)
      .single();

    if (error || !user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const requireSubscription = async (req, res, next) => {
  // Admins have unlimited access by default
  if (req.user?.role === 'admin') {
    req.subscription = { status: 'active', plan: 'unlimited', current_period_end: null };
    return next();
  }

  try {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .single();

    if (!sub) {
      return res.status(403).json({ error: 'Active subscription required', code: 'SUBSCRIPTION_REQUIRED' });
    }

    req.subscription = sub;
    next();
  } catch (err) {
    next(err);
  }
};

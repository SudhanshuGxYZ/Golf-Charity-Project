import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import supabase from '../utils/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { sendWelcomeEmail } from '../services/email.js';

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2),
  handicap: z.number().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function generateTokens(userId) {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if user exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', data.email)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: data.email,
        password_hash: passwordHash,
        full_name: data.full_name,
        handicap: data.handicap || null,
        role: 'user',
        is_active: true,
      })
      .select('id, email, full_name, role')
      .single();

    if (error) throw error;

    const tokens = generateTokens(user.id);

    // Store refresh token
    await supabase.from('refresh_tokens').insert({
      user_id: user.id,
      token: tokens.refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.full_name).catch(console.error);

    res.status(201).json({
      message: 'Registration successful',
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
      ...tokens,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, password_hash, role, is_active')
      .eq('email', data.email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account suspended. Please contact support.' });
    }

    const valid = await bcrypt.compare(data.password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const tokens = generateTokens(user.id);

    await supabase.from('refresh_tokens').insert({
      user_id: user.id,
      token: tokens.refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
      ...tokens,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    if (decoded.type !== 'refresh') throw new Error('Invalid token type');

    const { data: storedToken } = await supabase
      .from('refresh_tokens')
      .select('*')
      .eq('token', refreshToken)
      .eq('user_id', decoded.userId)
      .single();

    if (!storedToken || new Date(storedToken.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Rotate refresh token
    await supabase.from('refresh_tokens').delete().eq('token', refreshToken);

    const tokens = generateTokens(decoded.userId);
    await supabase.from('refresh_tokens').insert({
      user_id: decoded.userId,
      token: tokens.refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    res.json(tokens);
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await supabase.from('refresh_tokens').delete().eq('token', refreshToken);
  }
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, email, full_name, role, handicap, charity_id, charity_percentage, created_at')
      .eq('id', req.user.id)
      .single();

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, plan, current_period_end, stripe_subscription_id')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    res.json({ user, subscription: subscription || null });
  } catch (err) {
    next(err);
  }
});

export default router;

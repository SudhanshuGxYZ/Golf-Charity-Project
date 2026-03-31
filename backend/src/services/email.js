import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Georgia', serif; background: #0a0a0a; color: #f0f0f0; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #111; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1a472a 0%, #0a2a15 100%); padding: 40px; text-align: center; }
    .header h1 { color: #c9f542; font-size: 28px; margin: 0; letter-spacing: 2px; }
    .header p { color: rgba(255,255,255,0.6); margin: 8px 0 0; }
    .body { padding: 40px; }
    .body p { line-height: 1.7; color: #ccc; }
    .cta { display: inline-block; background: #c9f542; color: #0a0a0a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0; }
    .footer { padding: 20px 40px; border-top: 1px solid #222; color: #666; font-size: 12px; }
    .highlight { color: #c9f542; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⛳ GolfCharity</h1>
      <p>Play with purpose</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} GolfCharity Platform · <a href="${process.env.FRONTEND_URL}" style="color:#c9f542;">Visit Platform</a></p>
    </div>
  </div>
</body>
</html>
`;

export async function sendWelcomeEmail(email, name) {
  await transporter.sendMail({
    from: `"GolfCharity" <${process.env.FROM_EMAIL}>`,
    to: email,
    subject: 'Welcome to GolfCharity — Play with Purpose',
    html: baseTemplate(`
      <p>Hi <span class="highlight">${name}</span>,</p>
      <p>Welcome to GolfCharity! You're now part of a community that combines the love of golf with meaningful charitable impact.</p>
      <p>Here's what to do next:</p>
      <ul style="color: #ccc; line-height: 2;">
        <li>Choose your subscription plan</li>
        <li>Enter your last 5 Stableford scores</li>
        <li>Select a charity to support</li>
        <li>Enter the monthly draw for a chance to win!</li>
      </ul>
      <a href="${process.env.FRONTEND_URL}/dashboard" class="cta">Go to Dashboard →</a>
    `),
  });
}

export async function sendDrawResultEmail(email, name, matchType, prizeAmount) {
  const isWinner = !!matchType;
  await transporter.sendMail({
    from: `"GolfCharity" <${process.env.FROM_EMAIL}>`,
    to: email,
    subject: isWinner ? '🏆 You won in this month\'s draw!' : 'This month\'s draw results are in',
    html: baseTemplate(`
      <p>Hi <span class="highlight">${name}</span>,</p>
      ${isWinner ? `
        <p>Congratulations! You matched <span class="highlight">${matchType}</span> in this month's draw and have won <span class="highlight">£${prizeAmount.toFixed(2)}</span>!</p>
        <p>Please log in to your dashboard to upload your verification proof and claim your prize.</p>
        <a href="${process.env.FRONTEND_URL}/dashboard?tab=winnings" class="cta">Claim Your Prize →</a>
      ` : `
        <p>This month's draw has been completed. Unfortunately you didn't match enough numbers this time, but there's always next month!</p>
        <p>Keep your scores updated to stay eligible for every draw.</p>
        <a href="${process.env.FRONTEND_URL}/dashboard" class="cta">View Draw Results →</a>
      `}
    `),
  });
}

export async function sendPayoutEmail(email, name, amount) {
  await transporter.sendMail({
    from: `"GolfCharity" <${process.env.FROM_EMAIL}>`,
    to: email,
    subject: '💰 Your prize payout has been processed',
    html: baseTemplate(`
      <p>Hi <span class="highlight">${name}</span>,</p>
      <p>Great news! Your prize of <span class="highlight">£${amount.toFixed(2)}</span> has been approved and your payout is being processed.</p>
      <p>You should receive your payment within 3–5 business days.</p>
      <a href="${process.env.FRONTEND_URL}/dashboard?tab=winnings" class="cta">View Winnings →</a>
    `),
  });
}

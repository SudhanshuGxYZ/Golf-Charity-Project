import supabase from '../utils/supabase.js';

// Load prize pool config from DB
export async function getPoolConfig() {
  const { data } = await supabase.from('prize_pool_config').select('*').eq('is_active', true).single();
  return data || { five_match_pct: 40, four_match_pct: 35, three_match_pct: 25, subscription_pool_pct: 60, monthly_price: 29.99, yearly_price: 299.99 };
}

function randomNumbers() {
  const s = new Set();
  while (s.size < 5) s.add(Math.floor(Math.random() * 45) + 1);
  return [...s].sort((a, b) => a - b);
}

async function algorithmicNumbers() {
  const { data: scores } = await supabase.from('scores').select('score');
  if (!scores || scores.length < 10) return randomNumbers();

  const freq = {};
  for (let i = 1; i <= 45; i++) freq[i] = 0;
  scores.forEach(({ score }) => { if (freq[score] !== undefined) freq[score]++; });

  const maxFreq = Math.max(...Object.values(freq));
  const weights = {};
  for (let i = 1; i <= 45; i++) weights[i] = maxFreq - freq[i] + 1;

  const selected = new Set();
  while (selected.size < 5) {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    for (const [num, w] of Object.entries(weights)) {
      rand -= w;
      if (rand <= 0) { selected.add(+num); break; }
    }
  }
  return [...selected].sort((a, b) => a - b);
}

export async function generateDrawNumbers(method = 'random') {
  return method === 'algorithmic' ? algorithmicNumbers() : randomNumbers();
}

export async function simulateDraw(method = 'random') {
  const numbers = await generateDrawNumbers(method);
  const { data: allScores } = await supabase.from('scores').select('user_id, score');

  const userScoreMap = {};
  allScores?.forEach(({ user_id, score }) => {
    if (!userScoreMap[user_id]) userScoreMap[user_id] = new Set();
    userScoreMap[user_id].add(score);
  });

  const matches = { five: 0, four: 0, three: 0 };
  Object.values(userScoreMap).forEach(scores => {
    const count = numbers.filter(n => scores.has(n)).length;
    if (count === 5) matches.five++;
    else if (count === 4) matches.four++;
    else if (count === 3) matches.three++;
  });

  return { numbers, projectedMatches: matches, totalEligible: Object.keys(userScoreMap).length };
}

export async function executeDraw(drawId, adminId) {
  const { data: draw } = await supabase.from('draws').select('*').eq('id', drawId).single();
  if (!draw) throw new Error('Draw not found');
  if (draw.status === 'published') throw new Error('Draw already published');
  if (!draw.winning_numbers) throw new Error('No winning numbers set');

  const cfg = await getPoolConfig();
  const winNums = draw.winning_numbers;

  // Only eligible: active subscribers who completed a score session this draw month
  const { data: completeSessions } = await supabase
    .from('score_sessions')
    .select('user_id')
    .eq('draw_month', draw.draw_month)
    .eq('is_complete', true);

  const sessionUserIds = [...new Set(completeSessions?.map(s => s.user_id) || [])];

  const { data: activeSubs } = await supabase
    .from('subscriptions')
    .select('user_id, plan')
    .eq('status', 'active')
    .in('user_id', sessionUserIds);

  const subMap = {};
  activeSubs?.forEach(s => { subMap[s.user_id] = s.plan; });
  const eligibleIds = Object.keys(subMap);

  // Calculate prize pool from active subscribers
  let totalPool = 0;
  activeSubs?.forEach(({ plan }) => {
    const sub = plan === 'monthly' ? cfg.monthly_price : cfg.yearly_price / 12;
    totalPool += sub * (cfg.subscription_pool_pct / 100);
  });

  const rolloverIn = draw.jackpot_rollover_in || 0;
  const jackpotBase = totalPool * (cfg.five_match_pct / 100) + rolloverIn;
  const fourPool = totalPool * (cfg.four_match_pct / 100);
  const threePool = totalPool * (cfg.three_match_pct / 100);

  // Match scores
  const { data: allScores } = await supabase.from('scores').select('user_id, score').in('user_id', eligibleIds);
  const userScoreMap = {};
  allScores?.forEach(({ user_id, score }) => {
    if (!userScoreMap[user_id]) userScoreMap[user_id] = new Set();
    userScoreMap[user_id].add(score);
  });

  const winners = { five: [], four: [], three: [] };
  const winnerMatchNums = {};
  eligibleIds.forEach(uid => {
    const scores = userScoreMap[uid] || new Set();
    const matched = winNums.filter(n => scores.has(n));
    winnerMatchNums[uid] = matched;
    if (matched.length === 5) winners.five.push(uid);
    else if (matched.length === 4) winners.four.push(uid);
    else if (matched.length === 3) winners.three.push(uid);
  });

  const jackpotRollover = winners.five.length === 0 ? jackpotBase : 0;
  const prizes = {
    five: winners.five.length ? jackpotBase / winners.five.length : 0,
    four: winners.four.length ? fourPool / winners.four.length : 0,
    three: winners.three.length ? threePool / winners.three.length : 0,
  };

  const winnerInserts = [
    ...winners.five.map(uid => ({ draw_id: drawId, user_id: uid, match_type: '5-match', matched_numbers: winnerMatchNums[uid], prize_amount: prizes.five, status: 'pending' })),
    ...winners.four.map(uid => ({ draw_id: drawId, user_id: uid, match_type: '4-match', matched_numbers: winnerMatchNums[uid], prize_amount: prizes.four, status: 'pending' })),
    ...winners.three.map(uid => ({ draw_id: drawId, user_id: uid, match_type: '3-match', matched_numbers: winnerMatchNums[uid], prize_amount: prizes.three, status: 'pending' })),
  ];

  if (winnerInserts.length > 0) {
    await supabase.from('draw_results').insert(winnerInserts);
    // Notify winners
    await supabase.from('notifications').insert(
      winnerInserts.map(w => ({
        user_id: w.user_id, type: 'draw_result',
        title: `🏆 You won in the ${draw.draw_month} draw!`,
        message: `You matched ${w.match_type} and won ₹${Number(w.prize_amount).toFixed(2)}. Log in to submit your proof and claim your prize.`,
        reference_id: drawId, reference_type: 'draw',
      }))
    );
  }

  // Notify non-winners
  const winnerIds = new Set(winnerInserts.map(w => w.user_id));
  const nonWinners = eligibleIds.filter(uid => !winnerIds.has(uid));
  if (nonWinners.length > 0) {
    await supabase.from('notifications').insert(
      nonWinners.slice(0, 500).map(uid => ({
        user_id: uid, type: 'draw_result',
        title: `${draw.draw_month} draw results are in`,
        message: `The ${draw.draw_month} draw has been completed. You didn't match enough numbers this time — keep your scores updated for next month!`,
        reference_id: drawId, reference_type: 'draw',
      }))
    );
  }

  await supabase.from('draws').update({
    status: 'published',
    total_pool: Math.round(totalPool * 100) / 100,
    five_match_pool: Math.round(jackpotBase * 100) / 100,
    four_match_pool: Math.round(fourPool * 100) / 100,
    three_match_pool: Math.round(threePool * 100) / 100,
    winner_count: winnerInserts.length,
    participants_count: eligibleIds.length,
    jackpot_rollover: Math.round(jackpotRollover * 100) / 100,
    published_at: new Date().toISOString(),
    executed_by: adminId,
  }).eq('id', drawId);

  return { winningNumbers: winNums, winners, prizes, jackpotRollover, totalPool, participants: eligibleIds.length };
}

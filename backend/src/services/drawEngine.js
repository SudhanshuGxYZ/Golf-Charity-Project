import supabase from '../utils/supabase.js';

/**
 * Generate 5 draw numbers using random or algorithmic approach.
 * Stableford range: 1–45
 */
export async function generateDrawNumbers(method = 'random') {
  if (method === 'random') {
    return generateRandomNumbers();
  } else {
    return generateAlgorithmicNumbers();
  }
}

function generateRandomNumbers() {
  const numbers = new Set();
  while (numbers.size < 5) {
    numbers.add(Math.floor(Math.random() * 45) + 1);
  }
  return Array.from(numbers).sort((a, b) => a - b);
}

/**
 * Algorithmic draw: weighted toward scores that appear rarely
 * (gives underdogs a better chance, creates more winners).
 */
async function generateAlgorithmicNumbers() {
  const { data: scores } = await supabase
    .from('scores')
    .select('score');

  if (!scores || scores.length < 10) {
    return generateRandomNumbers();
  }

  // Count frequency of each score
  const freq = {};
  for (let i = 1; i <= 45; i++) freq[i] = 0;
  scores.forEach(({ score }) => { if (freq[score] !== undefined) freq[score]++; });

  // Inverse frequency weighting — rare scores have higher weight
  const maxFreq = Math.max(...Object.values(freq));
  const weights = {};
  for (let i = 1; i <= 45; i++) {
    weights[i] = maxFreq - freq[i] + 1; // +1 ensures no zero weight
  }

  const selected = new Set();
  while (selected.size < 5) {
    const num = weightedRandom(weights);
    selected.add(num);
  }
  return Array.from(selected).sort((a, b) => a - b);
}

function weightedRandom(weights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (const [num, weight] of Object.entries(weights)) {
    rand -= weight;
    if (rand <= 0) return parseInt(num);
  }
  return 1;
}

/**
 * Run a draw for a given month/year.
 * Finds all eligible subscribers, matches scores, determines winners.
 */
export async function executeDraw(drawId) {
  // Get the draw config
  const { data: draw, error: drawErr } = await supabase
    .from('draws')
    .select('*')
    .eq('id', drawId)
    .single();

  if (drawErr || !draw) throw new Error('Draw not found');
  if (draw.status !== 'pending') throw new Error('Draw already executed or not pending');

  const winningNumbers = draw.winning_numbers;

  // Get all active subscribers with their 5 scores
  const { data: subscribers } = await supabase
    .from('subscriptions')
    .select(`
      user_id,
      users!inner(id, email, full_name),
      scores:scores(score)
    `)
    .eq('status', 'active');

  // Actually fetch scores separately per user for correctness
  const { data: allScores } = await supabase
    .from('scores')
    .select('user_id, score');

  const userScoreMap = {};
  allScores?.forEach(({ user_id, score }) => {
    if (!userScoreMap[user_id]) userScoreMap[user_id] = new Set();
    userScoreMap[user_id].add(score);
  });

  const winners = { five: [], four: [], three: [] };

  subscribers?.forEach(({ user_id }) => {
    const userScores = userScoreMap[user_id] || new Set();
    const matchCount = winningNumbers.filter(n => userScores.has(n)).length;

    if (matchCount === 5) winners.five.push(user_id);
    else if (matchCount === 4) winners.four.push(user_id);
    else if (matchCount === 3) winners.three.push(user_id);
  });

  // Calculate prize pool
  const activeSubCount = subscribers?.length || 0;
  const { data: planData } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('status', 'active');

  let totalPool = 0;
  planData?.forEach(({ plan }) => {
    totalPool += plan === 'monthly' ? 29.99 * 0.6 : (299.99 / 12) * 0.6; // 60% to prize pool
  });

  // Check for jackpot rollover
  const { data: prevDraw } = await supabase
    .from('draws')
    .select('jackpot_rollover')
    .eq('status', 'published')
    .order('draw_date', { ascending: false })
    .limit(1)
    .single();

  const jackpotRollover = prevDraw?.jackpot_rollover || 0;
  const jackpotPool = totalPool * 0.40 + jackpotRollover;
  const fourMatchPool = totalPool * 0.35;
  const threeMatchPool = totalPool * 0.25;

  // Split prizes among multiple winners
  const prizes = {
    five_match: winners.five.length > 0 ? jackpotPool / winners.five.length : 0,
    four_match: winners.four.length > 0 ? fourMatchPool / winners.four.length : 0,
    three_match: winners.three.length > 0 ? threeMatchPool / winners.three.length : 0,
  };

  const newJackpotRollover = winners.five.length === 0 ? jackpotPool : 0;

  // Save results in draw_results table
  const winnerInserts = [
    ...winners.five.map(user_id => ({
      draw_id: drawId, user_id, match_type: '5-match',
      prize_amount: prizes.five_match, status: 'pending',
    })),
    ...winners.four.map(user_id => ({
      draw_id: drawId, user_id, match_type: '4-match',
      prize_amount: prizes.four_match, status: 'pending',
    })),
    ...winners.three.map(user_id => ({
      draw_id: drawId, user_id, match_type: '3-match',
      prize_amount: prizes.three_match, status: 'pending',
    })),
  ];

  if (winnerInserts.length > 0) {
    await supabase.from('draw_results').insert(winnerInserts);
  }

  // Update draw status
  await supabase.from('draws').update({
    status: 'published',
    total_pool: totalPool,
    jackpot_rollover: newJackpotRollover,
    winner_count: winnerInserts.length,
    published_at: new Date().toISOString(),
  }).eq('id', drawId);

  return {
    draw,
    winningNumbers,
    winners,
    prizes,
    jackpotRollover: newJackpotRollover,
    totalParticipants: activeSubCount,
  };
}

/**
 * Simulate a draw without saving results — for admin preview.
 */
export async function simulateDraw(method = 'random') {
  const numbers = await generateDrawNumbers(method);

  const { data: allScores } = await supabase
    .from('scores')
    .select('user_id, score');

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

  return { numbers, projectedMatches: matches };
}

// ---- Padel scoring engine (shared by LiveScore and Courtside) ----
var PT = ['0', '15', '30', '40', 'Ad'];
function engineInit(rules, preset) {
  var s = {
    rules: rules || { bestOf: 3, games: 6, deuce: 'golden', superTb: true, tiebreak: true },
    sets: [], g: [0, 0], p: [0, 0], tb: false, stb: false, server: 0, winner: -1, dc: 0, ends: false, log: [], hist: []
  };
  return Object.assign(s, preset || {});
}
function engineSnap(s) {
  return JSON.stringify({ sets: s.sets, g: s.g, p: s.p, tb: s.tb, stb: s.stb, server: s.server, winner: s.winner, dc: s.dc, ends: s.ends, log: s.log });
}
function engineLabel(s, i) { return (s.tb || s.stb) ? String(s.p[i]) : PT[s.p[i]]; }
function enginePoint(s, t, TEAMS) {
  if (s.winner >= 0) return null;
  var o = 1 - t, R = s.rules;
  var snap = engineSnap(s);
  var sets = s.sets.slice(), g = s.g.slice(), p = s.p.slice();
  var tb = s.tb, stb = s.stb, server = s.server, winner = -1, dc = s.dc, ends = false;
  var gameWon = false, setWon = false, entry = '';
  if (stb || tb) {
    p[t]++;
    var target = stb ? 10 : 7;
    if (p[t] >= target && p[t] - p[o] >= 2) {
      if (stb) { sets.push({ s: p.slice(), w: t, stb: true }); setWon = true; }
      else { g[t]++; gameWon = true; setWon = true; }
    }
    if ((p[0] + p[1]) % 2 === 1) server = 1 - server;
    if (!setWon && (p[0] + p[1]) % 6 === 0) ends = true;
    entry = (stb ? 'Super tiebreak ' : 'Tiebreak ') + p[0] + '–' + p[1];
  } else {
    var deciding = p[t] === 3 && p[o] === 3 && (R.deuce === 'golden' || (R.deuce === 'star' && dc >= 3));
    if (deciding || (p[t] === 3 && p[o] < 3) || p[t] === 4) gameWon = true;
    else if (p[t] === 3 && p[o] === 4) { p[o] = 3; dc++; entry = 'Back to deuce'; }
    else { p[t]++; if (p[0] === 3 && p[1] === 3) { dc++; entry = 'Deuce'; } }
    if (gameWon) {
      g[t]++; server = 1 - server; dc = 0;
      entry = (deciding ? (R.deuce === 'star' ? 'Star point' : 'Golden point') + ' · game ' : 'Game ') + TEAMS[t];
      if (g[t] >= R.games && g[t] - g[o] >= 2) setWon = true;
      else if ((g[0] + g[1]) % 2 === 1) ends = true;
    } else if (!entry) {
      entry = PT[p[0]] + '–' + PT[p[1]];
    }
  }
  if (gameWon || setWon) p = [0, 0];
  var need = (R.bestOf + 1) / 2;
  if (setWon) {
    var last = stb ? null : g.slice();
    if (last) { sets.push({ s: last, w: t }); if ((last[0] + last[1]) % 2 === 1) ends = true; }
    entry = 'Set ' + TEAMS[t] + ' · ' + sets[sets.length - 1].s.join('–');
    g = [0, 0]; tb = false; stb = false;
    var won = sets.filter(function (x) { return x.w === t; }).length;
    if (won === need) { winner = t; entry = 'Match ' + TEAMS[t]; ends = false; }
    else if (R.superTb && R.bestOf > 1 && sets.length === R.bestOf - 1) stb = true;
  } else if (gameWon && R.tiebreak && g[0] === R.games && g[1] === R.games) {
    tb = true; entry += ' · tiebreak';
  }
  var log = [{ text: entry, who: TEAMS[t] }].concat(s.log).slice(0, 40);
  return { sets: sets, g: g, p: p, tb: tb, stb: stb, server: server, winner: winner, dc: dc, ends: ends, log: log, hist: s.hist.concat([snap]) };
}
function engineUndo(s) {
  if (!s.hist.length) return null;
  var prev = JSON.parse(s.hist[s.hist.length - 1]);
  prev.hist = s.hist.slice(0, -1);
  return prev;
}
function engineBanner(s, TEAMS) {
  var R = s.rules;
  if (s.winner >= 0) return { text: 'Match over', icon: 'flag', hot: false };
  if (s.ends) return { text: 'Change ends', icon: 'swap_horiz', hot: true };
  if (s.stb) return { text: 'Super tiebreak · first to 10', icon: 'bolt', hot: true };
  if (s.tb) return { text: 'Tiebreak · first to 7', icon: 'bolt', hot: true };
  if (s.p[0] === 3 && s.p[1] === 3) {
    if (R.deuce === 'golden') return { text: 'Golden point · next point wins', icon: 'star', hot: true };
    if (R.deuce === 'star' && s.dc >= 3) return { text: 'Star point · next point wins', icon: 'star', hot: true };
    if (R.deuce === 'star') return { text: 'Deuce ' + s.dc + ' of 3 · star point on the 3rd', icon: 'balance', hot: true };
    return { text: 'Deuce · win two points in a row', icon: 'balance', hot: true };
  }
  if (s.p[0] === 4 || s.p[1] === 4) return { text: 'Advantage ' + TEAMS[s.p[0] === 4 ? 0 : 1], icon: 'trending_up', hot: true };
  return { text: TEAMS[s.server] + ' serving', icon: 'sports_tennis', hot: false };
}
function rulesLine(R) {
  var d = { golden: 'golden point', adv: 'advantage', star: 'star point' }[R.deuce];
  return (R.bestOf === 1 ? '1 set' : 'Best of ' + R.bestOf) + ' · sets to ' + R.games + ' · ' + d + (R.bestOf > 1 ? (R.superTb ? ' · super tiebreak' : ' · full final set') : '');
}

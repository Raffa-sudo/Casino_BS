// Mesin game: aturan, giliran, taruhan, pot, showdown. Tidak menyentuh DOM atau jaringan.
// Dijalankan hanya di browser tuan rumah. onChange() dipanggil setiap state berubah.
Poker.createEngine = function (onChange) {
  const { SB, BB, START, MAX_PLAYERS, NEXT_HAND_MS } = Poker.CONFIG;
  const G = { started: false, players: [], log: [], stage: 0, board: [], turn: -1, dealer: -1, cur: 0, minR: BB, over: null, show: false, hand: 0, sb: -1, bb: -1, startChips: START, result: null };

  const canAct = p => !p.folded && !p.allin && !p.out;
  const nx = (i, f) => { const P = G.players; for (let k = 1; k <= P.length; k++) { const j = ((i + k) % P.length + P.length) % P.length; if (f(P[j])) return j; } return i; };
  const lg = t => { G.log.push(t); if (G.log.length > 30) G.log.shift(); };
  function pay(p, n) { n = Math.max(0, Math.min(n, p.chips)); p.chips -= n; p.bet += n; p.total += n; if (p.chips == 0) p.allin = true; }

  function startHand() {
    const P = G.players;
    P.forEach(p => { if (p.chips <= 0 || p.gone) p.out = true; });
    const live = P.filter(p => !p.out);
    if (live.length < 2) { G.over = live[0] ? live[0].name : '-'; G.stage = 5; G.turn = -1; G.show = false; return onChange(); }
    G.hand++; G.result = null; G.dealer = nx(G.dealer, p => !p.out); G.deck = Poker.Eval.makeDeck(); G.board = []; G.stage = 0; G.show = false;
    P.forEach(p => { p.bet = 0; p.total = 0; p.folded = !!p.out; p.allin = false; p.acted = false; p.res = ''; p.win = false; p.hand = p.out ? [] : [G.deck.pop(), G.deck.pop()]; });
    const sb = live.length == 2 ? G.dealer : nx(G.dealer, p => !p.out), bb = nx(sb, p => !p.out);
    pay(P[sb], SB); pay(P[bb], BB); G.sb = sb; G.bb = bb; G.cur = BB; G.minR = BB; G.turn = bb;
    lg('Hand #' + G.hand + ' — Dealer: ' + P[G.dealer].name + ' | Small Blind: ' + P[sb].name + ' (' + SB + ') | Big Blind: ' + P[bb].name + ' (' + BB + ')');
    proceed();
  }

  // Cari pemain berikutnya yang harus bertindak; kalau tidak ada, lanjut ke babak berikutnya.
  function proceed() {
    const P = G.players;
    if (P.filter(p => !p.folded).length == 1) return finish(false);
    const need = P.filter(canAct).length;
    for (let k = 1; k <= P.length; k++) {
      const j = (G.turn + k) % P.length, p = P[j];
      if (canAct(p) && (!p.acted || p.bet < G.cur) && !(need < 2 && p.bet >= G.cur)) {
        G.turn = j;
        if (p.gone) return act(j, 'fold');
        return onChange();
      }
    }
    nextStage();
  }

  function nextStage() {
    G.players.forEach(p => { p.bet = 0; p.acted = false; });
    G.cur = 0; G.minR = BB; G.stage++;
    if (G.stage == 4) return finish(true);
    G.deck.pop(); // kartu bakar: dealer membuang kartu teratas, lalu membagikan kartu berikutnya
    for (let i = 0; i < (G.stage == 1 ? 3 : 1); i++) G.board.push(G.deck.pop());
    G.turn = G.dealer; proceed();
  }

  function act(i, a, amt) {
    const P = G.players, p = P[i];
    if (!p || G.turn != i || G.stage > 3) return;
    if (a == 'fold') { p.folded = true; lg(p.name + ' fold'); }
    else if (a == 'call') { const n = Math.min(G.cur - p.bet, p.chips); pay(p, n); lg(p.name + (n ? ' call ' + n : ' check')); }
    else {
      const was = G.cur, t = Math.min(Math.max(Math.floor(+amt) || 0, G.cur + G.minR), p.chips + p.bet);
      if (t > G.cur) { G.minR = Math.max(G.minR, t - G.cur); G.cur = t; P.forEach(q => { if (q != p) q.acted = false; }); }
      pay(p, t - p.bet); lg(p.name + (p.allin ? ' ALL-IN ' + p.bet : (was ? ' raise to ' : ' bet ') + p.bet));
    }
    p.acted = true; proceed();
  }

  function finish(show) {
    const P = G.players; G.stage = 5; G.turn = -1; G.show = show;
    const alive = P.filter(p => !p.folded), tot = P.reduce((a, p) => a + p.total, 0), pots = [];
    if (!show) { alive[0].chips += tot; alive[0].win = true; pots.push({ winners: [alive[0].name], amount: tot, uncontested: true }); }
    else {
      alive.forEach(p => { const b = Poker.Eval.best(p.hand.concat(G.board)); p.sc = b.score; p.res = b.name; p.best = b.cards; });
      let prev = 0; // bagi pot per level kontribusi (main pot, lalu side pot)
      [...new Set(alive.map(p => p.total))].sort((a, b) => a - b).forEach(L => {
        let pot = 0; P.forEach(p => pot += Math.min(p.total, L) - Math.min(p.total, prev)); prev = L;
        const el = alive.filter(p => p.total >= L), m = Math.max(...el.map(p => p.sc)), w = el.filter(p => p.sc == m);
        const sh = Math.floor(pot / w.length); w.forEach(p => { p.chips += sh; p.win = true; }); w[0].chips += pot - sh * w.length;
        if (el.length > 1) pots.push({ winners: w.map(p => p.name), amount: pot, hand: w[0].res, cards: w[0].best, beaten: el.filter(p => p.sc != m).map(p => ({ name: p.name, hand: p.res })) });
      });
    }
    G.result = { showdown: show, pots };
    P.forEach(p => p.bet = 0);
    onChange();
    setTimeout(() => { if (G.stage == 5 && !G.over) startHand(); }, NEXT_HAND_MS);
  }

  // State yang dikirim ke pemain i: kartu lawan disembunyikan sampai showdown.
  function view(i) {
    const P = G.players, sd = G.stage == 5; // akhir ronde: semua kartu dibuka
    return {
      started: G.started, stage: G.stage, board: G.board, hand: G.hand, sb: G.sb, bb: G.bb, result: G.result, startChips: G.startChips,
      burn: G.board.length >= 5 ? 3 : G.board.length >= 4 ? 2 : G.board.length >= 3 ? 1 : 0, pot: P.reduce((a, p) => a + (p.total || 0), 0),
      turn: G.turn, dealer: G.dealer, cur: G.cur, minR: G.minR, me: i, log: G.log.slice(-6), over: G.over,
      players: P.map((p, j) => ({
        name: p.name, chips: p.chips, bet: p.bet || 0, folded: p.folded, allin: p.allin, out: p.out, res: p.res, win: !!p.win,
        hand: !p.hand ? [] : (j == i || sd) ? p.hand : p.hand.length ? [null, null] : []
      }))
    };
  }

  const idx = id => G.players.findIndex(p => p.id == id);
  return {
    view,
    players: () => G.players,
    addPlayer(id, name) {
      if (G.started) return 'Game sudah berjalan.';
      if (G.players.length >= MAX_PLAYERS) return 'Meja penuh.';
      G.players.push({ id, name, chips: G.startChips }); onChange(); return null;
    },
    removePlayer(id) {
      const i = idx(id); if (i < 0) return;
      if (!G.started) { G.players.splice(i, 1); return onChange(); }
      G.players[i].gone = true; if (G.turn == i) act(i, 'fold');
    },
    setStartChips(n) { n = Math.floor(+n); if (G.started || !(n >= 2 * BB && n <= 1e6)) return false; G.startChips = n; G.players.forEach(p => p.chips = n); onChange(); return true; },
    start() { if (G.started || G.players.length < 2) return; G.started = true; startHand(); },
    act,
    actById(id, a, amt) { const i = idx(id); if (i >= 0) act(i, a, amt); }
  };
};

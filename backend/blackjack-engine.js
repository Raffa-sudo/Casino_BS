// Mesin Blackjack: taruhan, giliran, split/double, dealer, pembayaran. Tidak menyentuh DOM atau jaringan.
// Dijalankan hanya di browser tuan rumah. onChange() dipanggil setiap state berubah.
//
// Aturan: sepatu 6 dek; dealer berhenti di semua 17 (termasuk soft 17); Blackjack bayar 3:2; menang 1:1;
// dealer "intip" hole card kalau kartu terbukanya A atau 10 (Blackjack dealer langsung mengakhiri ronde);
// double boleh pada 2 kartu pertama (juga setelah split); split pasangan bernilai sama sampai MAX_HANDS hand;
// split As hanya dapat 1 kartu dan tidak bisa di-split lagi; 21 hasil split bukan Blackjack. Tanpa insurance & surrender.
Blackjack.createEngine = function (onChange, opts) {
  opts = opts || {};
  const K = Blackjack.CONFIG, { MIN_BET, MIN_PLAYERS, MAX_PLAYERS, MAX_HANDS, MIN_CHIPS } = K;
  const makeShoe = opts.makeShoe || (() => Casino.Deck.make(K.DECKS));
  const G = { started: false, phase: 'lobby', players: [], dealer: [], hole: false, shoe: [], shoeGen: 0, round: 0, turn: -1, deadline: 0,
              over: null, endAfter: false, log: [], startChips: K.START, gid: 1, timer: 0 };

  const cv = c => c.r == 14 ? 11 : Math.min(c.r, 10);
  const val = cs => { let t = 0, a = 0; cs.forEach(c => { t += cv(c); if (c.r == 14) a++; }); while (t > 21 && a) { t -= 10; a--; } return { total: t, soft: a > 0 }; };
  const isBJ = h => h.cards.length == 2 && !h.split && val(h.cards).total == 21;
  const lg = t => { G.log.push(t); if (G.log.length > 30) G.log.shift(); };
  const draw = () => { if (!G.shoe.length) { G.shoe = makeShoe(); G.shoeGen++; } return G.shoe.pop(); };
  const eligible = p => !p.out && !p.gone;
  const betOf = p => p.hands.reduce((a, h) => a + h.bet, 0);

  // Satu timer saja: fase-fase game berurutan, jadi tidak pernah ada dua timer sekaligus.
  function setT(fn, ms, showClock) {
    clearTimeout(G.timer); const gid = G.gid;
    G.deadline = showClock ? Date.now() + ms : 0;
    G.timer = setTimeout(() => { if (gid == G.gid) fn(); }, ms);
  }
  const clearT = () => { clearTimeout(G.timer); G.deadline = 0; };

  function newRound() {
    if (G.endAfter) return finishSession('host');
    G.players = G.players.filter(p => !p.gone); // pemain yang sudah keluar dibuang di sela ronde
    G.players.forEach(p => { p.hands = []; p.hi = 0; p.ready = false; p.sit = false; p.net = 0; p.out = p.chips < MIN_BET; });
    if (!G.players.some(eligible)) return finishSession('bust');
    G.dealer = []; G.hole = false; G.turn = -1; G.phase = 'bet';
    if (G.shoe.length < K.DECKS * 52 * K.RESHUFFLE_BELOW) { G.shoe = makeShoe(); G.shoeGen++; lg('Sepatu dikocok ulang'); }
    lg('Ronde #' + (G.round + 1) + ' — pasang taruhan');
    setT(betTimeout, K.BET_MS, true); onChange();
  }

  function betTimeout() {
    G.players.forEach(p => { if (eligible(p) && !p.ready) p.sit = true; });
    if (G.players.some(p => p.ready)) return deal();
    G.players.forEach(p => { p.sit = false; });
    setT(betTimeout, K.BET_MS, true); onChange(); // belum ada yang bertaruh: tunggu lagi
  }

  function checkAllBet() {
    const el = G.players.filter(eligible);
    if (el.length && el.every(p => p.ready || p.sit)) { if (el.some(p => p.ready)) deal(); else newRound(); } // semua melewatkan ronde: mulai pasang taruhan lagi
    else onChange();
  }

  function deal() {
    const P = G.players, ps = P.filter(p => p.ready); G.round++;
    for (let k = 0; k < 2; k++) { ps.forEach(p => p.hands[0].cards.push(draw())); G.dealer.push(draw()); }
    G.hole = true; G.phase = 'play'; clearT();
    lg('Kartu dibagikan');
    if (cv(G.dealer[0]) >= 10 && val(G.dealer).total == 21) { G.hole = false; lg('Dealer Blackjack!'); return settle(); } // dealer mengintip hole card
    ps.forEach(p => { if (isBJ(p.hands[0])) p.hands[0].done = true; });
    nextTurn();
  }

  function nextTurn() {
    const P = G.players;
    for (let i = 0; i < P.length; i++) {
      const p = P[i]; if (!p.ready) continue;
      const h = p.hands.findIndex(x => !x.done);
      if (h < 0) continue;
      p.hi = h; G.turn = i;
      const hand = p.hands[h];
      if (p.gone || val(hand.cards).total >= 21) { hand.done = true; return nextTurn(); } // pemain keluar: otomatis Stand
      setT(() => act(i, 'stand'), K.TURN_MS, true); // lewat batas waktu: otomatis Stand
      return onChange();
    }
    G.turn = -1; dealerPlay();
  }

  function canDo(p, h) {
    const two = h.cards.length == 2 && !h.done;
    return {
      hit: !h.done, stand: !h.done,
      double: two && !h.ace && p.chips >= h.bet,
      split: two && !h.ace && cv(h.cards[0]) == cv(h.cards[1]) && p.hands.length < MAX_HANDS && p.chips >= h.bet
    };
  }

  function act(i, a) {
    const p = G.players[i];
    if (!p || G.phase != 'play' || G.turn != i) return false;
    const h = p.hands[p.hi]; if (!h || h.done) return false;
    const can = canDo(p, h);
    if (a == 'hit') {
      h.cards.push(draw());
    } else if (a == 'stand') {
      h.done = true;
    } else if (a == 'double' && can.double) {
      p.chips -= h.bet; h.bet *= 2; h.doubled = true; h.cards.push(draw()); h.done = true;
    } else if (a == 'split' && can.split) {
      const [c0, c1] = h.cards, ace = c0.r == 14, h2 = { cards: [c1], bet: h.bet, done: false, split: true, ace };
      p.chips -= h.bet; h.cards = [c0]; h.split = true; h.ace = ace;
      h.cards.push(draw()); h2.cards.push(draw());
      p.hands.splice(p.hi + 1, 0, h2);
      if (ace) h.done = h2.done = true;
      lg(p.name + ' split');
    } else return false;
    [h, p.hands[p.hi + 1]].forEach(x => { if (x && !x.done && val(x.cards).total >= 21) x.done = true; });
    if (a == 'hit' || a == 'double') lg(p.name + (a == 'hit' ? ' hit' : ' double') + ' → ' + val(h.cards).total);
    if (a == 'stand') lg(p.name + ' stand');
    if (h.done) { clearT(); nextTurn(); } else { setT(() => act(i, 'stand'), K.TURN_MS, true); onChange(); }
    return true;
  }

  function dealerPlay() {
    G.phase = 'dealer'; G.hole = false; clearT();
    const needed = G.players.some(p => p.ready && p.hands.some(h => val(h.cards).total <= 21 && !isBJ(h)));
    onChange();
    const step = () => setT(() => {
      if (needed && val(G.dealer).total < 17) { G.dealer.push(draw()); onChange(); step(); } else settle();
    }, K.DEALER_STEP_MS);
    step();
  }

  function settle() {
    clearT();
    const dv = val(G.dealer).total, dbj = G.dealer.length == 2 && dv == 21;
    G.hole = false; G.phase = 'result';
    G.players.forEach(p => {
      if (!p.ready) return;
      p.net = 0;
      p.hands.forEach(h => {
        const t = val(h.cards).total, bj = isBJ(h); let pay = 0;
        if (t > 21) h.res = 'bust';
        else if (dbj) { if (bj) { h.res = 'push'; pay = h.bet; } else h.res = 'lose'; }
        else if (bj) { h.res = 'blackjack'; pay = h.bet + Math.floor(h.bet * 3 / 2); }
        else if (dv > 21 || t > dv) { h.res = 'win'; pay = h.bet * 2; }
        else if (t == dv) { h.res = 'push'; pay = h.bet; }
        else h.res = 'lose';
        p.chips += pay; h.pay = pay; p.net += pay - h.bet;
      });
      lg(p.name + (p.net > 0 ? ' +' : ' ') + p.net);
    });
    setT(newRound, K.RESULT_MS);
    onChange();
  }

  function finishSession(reason) {
    clearT(); G.phase = 'over'; G.turn = -1; G.hole = false;
    G.over = { reason, standings: G.players.map(p => ({ name: p.name, chips: p.chips, delta: p.chips - G.startChips, gone: !!p.gone })).sort((a, b) => b.chips - a.chips) };
    onChange();
  }

  const idx = id => G.players.findIndex(p => p.id == id);
  const E = {
    view(i) {
      const me = G.players[i], dc = G.dealer, shown = G.hole ? dc.slice(0, 1) : dc;
      return {
        game: 'blackjack', started: G.started, gid: G.gid, phase: G.phase, round: G.phase == 'bet' ? G.round + 1 : G.round, me: i, startChips: G.startChips, minBet: MIN_BET,
        shoeGen: G.shoeGen, shoe: G.shoe.length, turn: G.turn, left: G.deadline ? Math.max(0, G.deadline - Date.now()) : 0, endAfter: G.endAfter,
        over: G.over, log: G.log.slice(-6),
        can: me && G.phase == 'play' && G.turn == i && me.hands[me.hi] ? canDo(me, me.hands[me.hi]) : null,
        dealer: { cards: dc.map((c, k) => (G.hole && k == 1) ? null : c), total: shown.length ? val(shown).total : 0, soft: shown.length ? val(shown).soft : false,
                  bj: !G.hole && dc.length == 2 && val(dc).total == 21, bust: !G.hole && val(dc).total > 21 },
        players: G.players.map(p => ({
          name: p.name, chips: p.chips, bet: betOf(p), ready: !!p.ready, sit: !!p.sit, out: !!p.out, gone: !!p.gone, hi: p.hi || 0, last: p.last || 0, net: p.net || 0,
          hands: (p.hands || []).map(h => { const v = val(h.cards); return { cards: h.cards, bet: h.bet, total: v.total, soft: v.soft, bj: isBJ(h), bust: v.total > 21, doubled: !!h.doubled, done: !!h.done, res: h.res || '', pay: h.pay || 0 }; })
        }))
      };
    },
    players: () => G.players,
    addPlayer(id, name) {
      if (G.started) { // pemain yang terputus boleh kembali ke kursinya dengan nama yang sama
        const p = G.players.find(q => q.gone && q.name == name);
        if (!p) return 'Game sudah berjalan.';
        p.id = id; p.gone = false; lg(name + ' kembali ke meja'); onChange(); return null;
      }
      if (G.players.length >= MAX_PLAYERS) return 'Meja penuh.';
      G.players.push({ id, name, chips: G.startChips, hands: [] }); onChange(); return null;
    },
    removePlayer(id) {
      const i = idx(id); if (i < 0) return;
      const p = G.players[i];
      if (!G.started) { G.players.splice(i, 1); return onChange(); }
      if (p.gone) return;
      p.gone = true; lg(p.name + ' keluar dari meja');
      if (G.phase == 'play' && G.turn == i) return act(i, 'stand');
      if (G.phase == 'bet') return checkAllBet();
      onChange();
    },
    setStartChips(n) { n = Math.floor(+n); if (G.started || !(n >= MIN_CHIPS && n <= 1e6)) return false; G.startChips = n; G.players.forEach(p => p.chips = n); onChange(); return true; },
    start() { if (G.started || G.players.length < MIN_PLAYERS) return; G.started = true; G.shoe = []; G.round = 0; newRound(); },
    // Taruhan: jumlah dikunci begitu dipasang. 'sit' = lewati ronde ini.
    bet(i, amt) {
      const p = G.players[i]; amt = Math.floor(+amt);
      if (!p || G.phase != 'bet' || !eligible(p) || p.ready || p.sit || !(amt >= MIN_BET && amt <= p.chips)) return false;
      p.chips -= amt; p.hands = [{ cards: [], bet: amt, done: false }]; p.ready = true; p.last = amt;
      checkAllBet(); return true;
    },
    sit(i) { const p = G.players[i]; if (!p || G.phase != 'bet' || !eligible(p) || p.ready) return false; p.sit = true; checkAllBet(); return true; },
    act,
    // Tuan rumah mengakhiri sesi: langsung kalau sedang jeda, selain itu setelah ronde ini selesai.
    endSession() {
      if (!G.started || G.phase == 'over') return;
      if (G.phase == 'bet') { G.players.forEach(p => { if (p.ready) { p.chips += betOf(p); p.hands = []; p.ready = false; } }); return finishSession('host'); }
      if (G.phase == 'result') return finishSession('host');
      G.endAfter = true; onChange();
    },
    // Akhir sesi: 'lobby' = kembali ke ruang tunggu; 'again' = main lagi dari awal dengan chip awal yang sama.
    reset(mode) {
      clearT(); clearTimeout(G.timer); G.gid++;
      G.players = G.players.filter(p => !p.gone);
      Object.assign(G, { started: false, phase: 'lobby', dealer: [], hole: false, shoe: [], round: 0, turn: -1, deadline: 0, over: null, endAfter: false, log: [] });
      G.players.forEach(p => { p.chips = G.startChips; p.hands = []; p.hi = 0; p.ready = p.sit = p.out = false; p.net = 0; p.last = 0; });
      if (mode != 'again' || G.players.length < MIN_PLAYERS) { onChange(); return 'lobby'; }
      G.started = true; newRound(); return 'again';
    },
    actById(id, a, amt) { // pesan dari jaringan
      const i = idx(id); if (i < 0) return;
      if (a == 'bet') E.bet(i, amt); else if (a == 'sit') E.sit(i); else act(i, a);
    }
  };
  return E;
};

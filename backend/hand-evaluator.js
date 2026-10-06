// Dek kartu dan penilai tangan. Kartu = {r: 2..14, s: 0..3}
Poker.Eval = (function () {
  const NAMES = ['High Card', 'One Pair', 'Two Pair', 'Three of a Kind', 'Straight',
                 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush'];

  function eval5(c) {
    const r = c.map(x => x.r).sort((a, b) => b - a), fl = c.every(x => x.s == c[0].s);
    let st = false, hi = r[0];
    if (new Set(r).size == 5) {
      if (r[0] - r[4] == 4) st = true;
      else if (r.join() == '14,5,4,3,2') { st = true; hi = 5; }
    }
    const m = {}; r.forEach(x => m[x] = (m[x] || 0) + 1);
    const g = Object.entries(m).map(([k, v]) => [+k, v]).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
    const n = g.map(x => x[1]).join(''); let k = g.map(x => x[0]), cat;
    if (st && fl) cat = 8; else if (n == '41') cat = 7; else if (n == '32') cat = 6;
    else if (fl) cat = 5; else if (st) cat = 4; else if (n == '311') cat = 3;
    else if (n == '221') cat = 2; else if (n[0] == '2') cat = 1; else cat = 0;
    if (st) k = [hi];
    return [cat, ...k.concat([0, 0, 0, 0]).slice(0, 5)];
  }

  // Tangan terbaik dari 5-7 kartu -> {score, name, cards (5 kartu pembentuk hand)}
  function best(cards) {
    let b = { score: -1 };
    for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
      const h = cards.filter((_, x) => x != i && x != j), e = eval5(h);
      const score = e.reduce((a, x) => a * 15 + x, 0);
      if (score > b.score) b = { score, cat: e[0], top: e[1], hand: h };
    }
    return { score: b.score, name: b.cat == 8 && b.top == 14 ? 'Royal Flush' : NAMES[b.cat], cards: b.hand.slice().sort((x, y) => y.r - x.r) };
  }

  const makeDeck = () => Casino.Deck.make(1);

  return { best, makeDeck };
})();

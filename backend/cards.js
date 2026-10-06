// Dek kartu bersama untuk semua game. Kartu = {r: 2..14 (11=J, 12=Q, 13=K, 14=A), s: 0..3}
Casino.Deck = {
  // n dek digabung (n=1 untuk poker, 6 untuk blackjack), dikocok dengan RNG kriptografis. Kartu diambil dengan pop().
  make(n) {
    const d = [];
    for (let k = 0; k < (n || 1); k++) for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ r, s });
    const lim = 4294967296;
    for (let i = d.length - 1; i > 0; i--) { // Fisher–Yates tanpa modulo bias
      const max = lim - lim % (i + 1); let x;
      do { x = crypto.getRandomValues(new Uint32Array(1))[0]; } while (x >= max);
      const j = x % (i + 1);
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  }
};

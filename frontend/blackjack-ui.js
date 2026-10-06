// Tampilan meja Blackjack (landscape): dealer di atas, kursi pemain melengkung di bawah, panel taruhan/aksi.
// Hanya menggambar state yang diterima. Ruang tunggu dan banner koneksi ada di lobby.js.
Blackjack.UI = (function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SU = ['♠', '♥', '♦', '♣'], RK = ['', '', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const PH = { bet: 'Taruhan', play: 'Giliran pemain', dealer: 'Giliran dealer', result: 'Hasil', over: 'Selesai' };
  const RES = { blackjack: 'Blackjack!', win: 'Menang', push: 'Push', lose: 'Kalah', bust: 'Bust' };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cfg = { isHost: false, onAction() {}, onNext() {}, onEnd() {} };
  let seen = new Set(), actKey = '', lastGid = 0, lastRound = -1, lastShoe = -1, lastPhase = '', staged = 0, deadlineAt = 0, clockLabel = '';

  const card = (c, k, extra) => c
    ? `<span class="c ${c.s == 1 || c.s == 2 ? 'r' : ''}" data-k="${k}" data-up="1" ${extra || ''}>${RK[c.r]}${SU[c.s]}</span>`
    : `<span class="c b" data-k="${k}" ${extra || ''}></span>`;
  const sgn = n => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);

  function init(c) {
    cfg = c;
    // Mouse-down pada tombol tidak boleh memindahkan fokus (lihat catatan di table-ui.js)
    $('act').addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
    $('endBtn').onclick = () => cfg.onEnd();
    setInterval(tick, 250);
  }
  function leave() {
    seen = new Set(); actKey = ''; lastRound = -1; lastShoe = -1; lastPhase = ''; staged = 0; deadlineAt = 0; clockLabel = '';
    $('act').innerHTML = ''; $('standings').hidden = true; $('seats').innerHTML = ''; $('dhand').innerHTML = '';
  }

  function tick() {
    const el = $('clock'); if (!el) return;
    el.textContent = deadlineAt ? '⏱ ' + clockLabel + ' ' + Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000)) + ' dtk' : '';
  }

  // Kursi disusun melengkung (tengah paling rendah), urut kiri → kanan sama untuk semua pemain.
  // Kursi dijangkar di tepi bawahnya, jadi hand tambahan (split) tumbuh ke atas dan nama/chip tetap terlihat.
  function layout(n) {
    return Array.from({ length: n }, (_, k) => {
      const t = n == 1 ? .5 : k / (n - 1);
      return [n == 1 ? 50 : 11 + 78 * t, 75 + 17 * (1 - Math.pow(2 * t - 1, 2))]; // y = tepi bawah kursi
    });
  }

  function toast(t) {
    if (reduce) return;
    $('toast').textContent = t;
    $('toast').animate([{ opacity: 0, transform: 'translate(-50%,-10px)' }, { opacity: 1, transform: 'translate(-50%,0)', offset: .15 },
      { opacity: 1, offset: .8 }, { opacity: 0 }], { duration: 1800 });
  }

  const handLabel = (h, many) => {
    if (h.res) return RES[h.res] + (h.res == 'push' ? '' : ' ' + sgn(h.pay - h.bet));
    if (h.bust) return 'BUST';
    if (h.bj) return 'Blackjack';
    return (h.soft && h.total < 21 ? (h.total - 10) + '/' + h.total : h.total) + (h.doubled ? ' ×2' : '') + (many ? ' · ' + h.bet : '');
  };

  // Kartu baru terbang dari sepatu (shoe); hole card dealer yang dibuka berputar (flip).
  function animate() {
    const sh = $('shoe').getBoundingClientRect(), ox = sh.left + sh.width / 2, oy = sh.top + sh.height / 2;
    document.querySelectorAll('#game [data-k]').forEach(el => {
      const k = el.dataset.k, up = el.dataset.up;
      if (!seen.has(k)) {
        seen.add(k); if (up) seen.add(k + 'u');
        if (reduce) return;
        const r = el.getBoundingClientRect(), d = +el.dataset.d || 0;
        el.animate([{ transform: `translate(${ox - r.left - r.width / 2}px,${oy - r.top - r.height / 2}px) scale(.4) rotate(-25deg)`, opacity: 0 },
          { transform: 'none', opacity: 1 }], { duration: 420, delay: d * 1000, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
      } else if (up && !seen.has(k + 'u')) {
        seen.add(k + 'u'); if (!reduce) el.animate([{ transform: 'rotateY(90deg)' }, { transform: 'none' }], { duration: 380 });
      }
    });
  }

  function render(s) {
    if (s.gid != lastGid) { leave(); lastGid = s.gid; } // sesi baru (Lanjut main): mulai dari nol
    renderAct(s); // panel aksi paling dulu, supaya tombol selalu mengikuti state terbaru
    const n = s.players.length, pos = layout(n), me = s.players[s.me];
    const readyIdx = []; s.players.forEach((p, i) => { if (p.hands.length) readyIdx[i] = readyIdx.filter(x => x !== undefined).length; });
    const nReady = readyIdx.filter(x => x !== undefined).length;
    const D = s.dealer, dn = s.turn >= 0 && s.players[s.turn] ? s.players[s.turn].name : '';

    let label = '';
    if (s.shoeGen != lastShoe && lastShoe >= 0) label = 'Sepatu dikocok ulang';
    else if (s.phase == 'bet' && lastPhase != 'bet') label = 'Ronde #' + s.round + ' — pasang taruhan';
    else if (s.phase == 'result' && lastPhase != 'result') label = D.bj ? 'Dealer Blackjack!' : D.bust ? 'Dealer bust!' : '';
    lastShoe = s.shoeGen; lastPhase = s.phase; lastRound = s.round;

    $('hno').textContent = 'Ronde #' + s.round + ' · ' + PH[s.phase] + ' · Taruhan min ' + s.minBet;
    $('bm').textContent = s.over ? '' : s.phase == 'bet' ? 'Pasang taruhanmu' : s.phase == 'play' ? (dn ? 'Giliran ' + dn : '') : s.phase == 'dealer' ? 'Dealer bermain…' : s.phase == 'result' ? 'Hasil ronde' : '';
    if (s.endAfter && !s.over) $('bm').textContent += ' · sesi berakhir setelah ronde ini';
    deadlineAt = s.left ? Date.now() + s.left : 0; clockLabel = s.phase == 'bet' ? 'Taruhan' : dn ? 'Giliran ' + dn : '';
    tick();

    const dtl = D.bust ? 'BUST' : D.bj ? 'Blackjack' : (D.soft && D.total < 21 ? (D.total - 10) + '/' + D.total : D.total);
    $('dhand').innerHTML = D.cards.length
      ? `<div class="cards">${D.cards.map((c, i) => card(c, `r${s.round}-d${i}`, `data-d="${i < 2 ? (i * (nReady + 1) + nReady) * .12 : 0}"`)).join('')}</div><span class="tot ${D.bust ? 'bust' : D.bj ? 'blackjack' : ''}">${dtl}</span>`
      : '';

    $('seats').innerHTML = s.players.map((p, i) => {
      const [x, y] = pos[i], cur = s.phase == 'play' && i == s.turn;
      const hands = p.hands.map((h, hi) => `<div class="hand ${cur && hi == p.hi ? 'act' : ''}"><div class="cards">${h.cards.map((c, k) =>
        card(c, `r${s.round}-p${i}-h${hi}-${k}`, `data-d="${hi == 0 && k < 2 ? (k * (nReady + 1) + readyIdx[i]) * .12 : 0}"`)).join('')}</div>
        <span class="tot ${h.res || (h.bust ? 'bust' : h.bj ? 'blackjack' : '')}">${handLabel(h, p.hands.length > 1)}</span></div>`).join('');
      let info = '', cls = '';
      if (p.gone) info = 'Keluar';
      else if (p.out) info = 'Busted';
      else if (s.phase == 'bet') info = p.ready ? 'Bet ' + p.bet : p.sit ? 'Lewati' : 'Menunggu…';
      else if (!p.ready) info = 'Tidak ikut';
      else if (s.phase == 'result') { info = p.net > 0 ? sgn(p.net) : p.net < 0 ? sgn(p.net) : 'Push'; cls = p.net > 0 ? 'up' : p.net < 0 ? 'dn' : ''; }
      else info = 'Bet ' + p.bet;
      return `<div class="bseat ${i == s.me ? 'me' : ''} ${cur ? 'turn' : ''} ${p.hands.length > 2 ? 'many' : ''} ${p.out ? 'out' : ''} ${p.gone ? 'gone' : ''}" style="left:${x}%;top:${y}%">
        <div class="hands">${hands}</div>
        <div class="pill"><div class="nm">${esc(p.name)}</div><div class="ch">${p.gone ? '—' : p.out ? 'Busted' : p.chips + ' chip'}</div><div class="rs ${cls}">${info}</div></div></div>`;
    }).join('');

    const st = $('standings');
    if (s.over) {
      st.hidden = false;
      st.innerHTML = `<h2>${s.over.reason == 'bust' ? 'Semua pemain kehabisan chip' : 'Sesi diakhiri tuan rumah'} — papan skor</h2><table>` +
        s.over.standings.map((r, k) => `<tr><td>${k + 1}.</td><td>${k == 0 ? '★ ' : ''}${esc(r.name)}${r.gone ? ' <small>(keluar)</small>' : ''}</td><td>${r.chips}</td><td class="${r.delta >= 0 ? 'up' : 'dn'}">${sgn(r.delta)}</td></tr>`).join('') + '</table>';
    } else st.hidden = true;

    animate();
    if (label) toast(label);
  }

  // Panel bawah: taruhan (fase bet), aksi (giliranmu), atau keterangan. Dibangun ulang hanya saat ada perubahan penting.
  function renderAct(s) {
    const a = $('act'), me = s.players[s.me];
    $('endBtn').hidden = !cfg.isHost || !!s.over; $('endBtn').disabled = !!s.endAfter; $('endBtn').textContent = s.endAfter ? 'Sesi berakhir setelah ronde' : 'Akhiri sesi';
    const key = [s.gid, s.round, s.phase, s.turn, me.hi, me.ready, me.sit, me.chips, me.out, me.gone, JSON.stringify(s.can), !!s.over, cfg.isHost].join();
    if (key == actKey) return; actKey = key;
    const wait = t => { a.innerHTML = `<span class="wt">${t}</span>`; };

    if (s.over) {
      if (!cfg.isHost) return wait('Sesi selesai. Menunggu tuan rumah: lanjut main atau kembali ke lobby…');
      a.innerHTML = `<span class="wt">Sesi selesai.</span><button class="ab call" id="bagain" title="Reset semua chip ke ${s.startChips} dan mulai dari awal">Lanjut main (${s.startChips} chip)</button><button class="ab fold" id="bstop" title="Kembali ke ruang tunggu; chip awal bisa diatur lagi">Berhenti</button>`;
      $('bagain').onclick = () => cfg.onNext('again'); $('bstop').onclick = () => cfg.onNext('lobby'); return;
    }
    if (me.out) return wait('Chip kamu kurang dari taruhan minimum. Menonton…');
    const lock = () => { // cegah tap ganda (Hit dua kali) sambil menunggu state baru; dibuka lagi jika tak ada balasan
      const k = actKey; a.querySelectorAll('button').forEach(b => b.disabled = true);
      setTimeout(() => { if (actKey == k) a.querySelectorAll('button').forEach(b => b.disabled = false); }, 2500);
    };
    const send = (act, amt) => () => { lock(); cfg.onAction(act, amt); };

    if (s.phase == 'bet') {
      if (me.ready) return wait('Taruhan ' + me.bet + ' terpasang. Menunggu pemain lain…');
      if (me.sit) return wait('Kamu melewati ronde ini.');
      const max = me.chips, min = s.minBet;
      a.innerHTML = `<span class="bamt" id="bamt"></span>` + [1, 5, 10, 50].map(m => `<button class="chipbtn" data-v="${m * min}">+${m * min}</button>`).join('') +
        `<button class="chipbtn" data-v="max">Max</button>` + (me.last && me.last <= max ? `<button class="chipbtn" id="rebet">Ulangi ${me.last}</button>` : '') +
        `<button class="chipbtn" id="clr">Hapus</button><button class="ab call" id="go"></button><button class="ab sec" id="skip">Lewati ronde</button>`;
      const upd = () => {
        staged = Math.max(0, Math.min(staged, max)); $('bamt').textContent = staged;
        $('go').textContent = staged >= min ? 'Taruhan ' + staged : 'Min ' + min; $('go').disabled = staged < min;
      };
      a.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { staged = b.dataset.v == 'max' ? max : staged + (+b.dataset.v); upd(); });
      if ($('rebet')) $('rebet').onclick = () => { staged = me.last; upd(); };
      $('clr').onclick = () => { staged = 0; upd(); };
      $('go').onclick = () => { staged = Math.min(staged, max); lock(); cfg.onAction('bet', staged); };
      $('skip').onclick = send('sit');
      upd(); return;
    }
    if (s.phase == 'play' && s.turn == s.me && s.can) {
      const c = s.can;
      a.innerHTML = `<button class="ab hit" id="bh">Hit</button><button class="ab stand" id="bs">Stand</button>` +
        (c.double ? `<button class="ab dbl" id="bd" title="Gandakan taruhan, terima 1 kartu, lalu otomatis Stand">Double</button>` : '') +
        (c.split ? `<button class="ab split" id="bp" title="Pisahkan pasangan menjadi dua hand">Split</button>` : '');
      $('bh').onclick = send('hit'); $('bs').onclick = send('stand');
      if (c.double) $('bd').onclick = send('double'); if (c.split) $('bp').onclick = send('split');
      return;
    }
    if (s.phase == 'result') return wait(me.hands.length ? (me.net > 0 ? 'Kamu menang ' + me.net + ' chip' : me.net < 0 ? 'Kamu kalah ' + -me.net + ' chip' : 'Seri (push)') + ' · ronde berikutnya segera…' : 'Ronde berikutnya segera…');
    if (s.phase == 'dealer') return wait('Dealer bermain…');
    wait(s.turn >= 0 && s.players[s.turn] ? 'Menunggu ' + esc(s.players[s.turn].name) + '…' : '');
  }

  return { init, leave, render };
})();

// Tampilan meja (landscape): kursi 1–8, animasi kartu, panel aksi. Hanya menggambar state yang diterima.
Poker.UI = (function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SU = ['♠', '♥', '♦', '♣'], RK = ['', '', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const STG = ['Pre-flop', 'Flop', 'Turn', 'River', '', 'Selesai'];
  const ANG = [125, 160, 200, 235, 305, 340, 20, 55], AX = 41, BY = 38; // sudut kursi di tepi oval (kiri → atas → kanan)
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cfg = { isHost: false, onStart() {}, onAction() {} }, invite = '';
  let seen = new Set(), busy = 0, pending = null, timer = 0, actKey = '', lastHand = -1, lastStage = -1;

  const setStatus = t => $('st').textContent = t;
  const card = (c, k, extra) => c
    ? `<span class="c ${c.s == 1 || c.s == 2 ? 'r' : ''}" data-k="${k}" data-up="1" ${extra || ''}>${RK[c.r]}${SU[c.s]}</span>`
    : `<span class="c b" data-k="${k}" ${extra || ''}></span>`;

  function init(c) {
    cfg = c;
    $('startBtn').onclick = () => cfg.onStart();
    $('cp').onclick = () => (navigator.clipboard ? navigator.clipboard.writeText(invite) : Promise.reject())
      .then(() => setStatus('Tautan disalin.')).catch(() => setStatus(invite));
    document.querySelectorAll('.fs').forEach(b => b.onclick = () => {
      const d = document.documentElement;
      (d.requestFullscreen ? d.requestFullscreen() : Promise.reject())
        .then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape')).catch(() => {});
    });
  }
  function showRoom(code, isHost, inviteUrl) {
    invite = inviteUrl || ''; $('room').hidden = false; $('rc').textContent = code;
    $('shr').hidden = !isHost; $('wait').hidden = isHost;
  }

  // Posisi tiap pemain: pemain ini selalu di bawah-tengah, lainnya searah jarum jam; tengah-atas dikosongkan untuk dealer.
  function layout(n, me) {
    const pos = [], m = n - 1;
    for (let o = 0; o < n; o++) {
      if (o == 0) { pos[me] = [50, 50 + BY]; continue; }
      const a = ANG[Math.floor((o - 0.5) * 8 / m)] * Math.PI / 180;
      pos[(me + o) % n] = [50 + AX * Math.cos(a), 50 + BY * Math.sin(a)];
    }
    return pos;
  }

  function toast(t) {
    if (reduce) return;
    $('toast').textContent = t;
    $('toast').animate([{ opacity: 0, transform: 'translate(-50%,-10px)' }, { opacity: 1, transform: 'translate(-50%,0)', offset: .15 },
      { opacity: 1, offset: .8 }, { opacity: 0 }], { duration: 1800 });
  }

  // Kartu baru terbang dari tumpukan dealer; kartu yang baru dibuka berputar (flip).
  function animate() {
    const dk = $('deck').getBoundingClientRect(), ox = dk.left + dk.width / 2, oy = dk.top + dk.height / 2;
    const els = [...document.querySelectorAll('#game [data-k]')];
    const newBurn = els.some(e => e.dataset.x && !seen.has(e.dataset.k));
    let end = 0, nb = 0;
    els.forEach(el => {
      const k = el.dataset.k, up = el.dataset.up;
      if (!seen.has(k)) {
        seen.add(k); if (up) seen.add(k + 'u');
        if (reduce) return;
        const d = el.dataset.bi !== undefined ? (newBurn ? .5 : 0) + (nb++) * .3 : +el.dataset.d || 0;
        const r = el.getBoundingClientRect();
        el.animate([{ transform: `translate(${ox - r.left - r.width / 2}px,${oy - r.top - r.height / 2}px) scale(.4) rotate(-25deg)`, opacity: 0 },
          { transform: 'none', opacity: 1 }], { duration: 480, delay: d * 1000, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
        end = Math.max(end, d * 1000 + 480);
      } else if (up && !seen.has(k + 'u')) {
        seen.add(k + 'u'); if (reduce) return;
        el.animate([{ transform: 'rotateY(90deg)' }, { transform: 'none' }], { duration: 380 }); end = Math.max(end, 380);
      }
    });
    if (end) {
      busy = Date.now() + end;
      $('dealer').animate([{ transform: 'translateX(-50%) scale(1.07)' }, { transform: 'translateX(-50%) scale(1)' }], { duration: 320, iterations: Math.ceil(end / 320) });
    }
  }

  function render(s) {
    // Tunda render selama animasi kartu masih berjalan (hanya state terbaru yang dipakai).
    if (Date.now() < busy) { pending = s; clearTimeout(timer); timer = setTimeout(() => { const p = pending; pending = null; render(p); }, busy - Date.now()); return; }
    document.body.classList.toggle('playing', s.started);
    $('lobby').hidden = s.started; $('game').hidden = !s.started;
    if (!s.started) {
      $('plist').innerHTML = s.players.map(p => `<li>${esc(p.name)}</li>`).join('');
      $('startBtn').hidden = !cfg.isHost || s.players.length < 2; return;
    }
    const n = s.players.length, pos = layout(n, s.me);
    const label = s.hand != lastHand ? 'Tangan #' + s.hand + ' — kartu dibagikan' : (s.stage >= 1 && s.stage <= 3 && s.stage != lastStage ? STG[s.stage] : '');
    lastHand = s.hand; lastStage = s.stage;
    $('hno').textContent = 'Tangan #' + s.hand + ' · ' + STG[s.stage] + ' · Blind ' + Poker.CONFIG.SB + '/' + Poker.CONFIG.BB;
    $('pot').textContent = 'Pot ' + s.pot;
    $('msg').textContent = s.log[s.log.length - 1] || '';
    $('board').innerHTML = Array.from({ length: 5 }, (_, i) => s.board[i] ? card(s.board[i], `h${s.hand}-b${i}`, `data-bi="${i}"`) : '<span class="c e"></span>').join('');
    $('burn').innerHTML = Array.from({ length: s.burn }, (_, i) => `<span class="c b" data-k="h${s.hand}-x${i}" data-x="1" data-bi="${i}" style="left:${i * 4}px;top:${i * 3}px"></span>`).join('');
    const over = $('over'); over.hidden = !s.over; if (s.over) over.textContent = 'Pemenang akhir: ' + s.over;

    $('seats').innerHTML = s.players.map((p, i) => {
      const [x, y] = pos[i], cls = y < 30 ? 'top' : y > 70 ? 'bot' : x < 50 ? 'left' : 'right';
      const order = ((i - s.dealer - 1) % n + n) % n; // urutan pembagian: mulai dari kiri dealer
      const tags = (i == s.dealer ? '<span class="tag d">D</span>' : '') + (i == s.sb ? '<span class="tag sb">SB</span>' : '') + (i == s.bb ? '<span class="tag bb">BB</span>' : '');
      const info = p.win ? 'MENANG' : p.res || (p.out ? '' : p.folded ? 'fold' : p.allin ? 'all-in' : '');
      const bet = p.bet > 0 ? `<span class="bet" style="left:${x + (50 - x) * .45}%;top:${y + (50 - y) * .45}%">${p.bet}</span>` : '';
      return `<div class="seat ${cls} ${i == s.me ? 'me' : ''} ${i == s.turn ? 'turn' : ''} ${p.folded ? 'fold' : ''} ${p.win ? 'win' : ''}" style="left:${x}%;top:${y}%">
        <div class="pill"><div class="nm">${esc(p.name)}${tags}</div><div class="ch">${p.out ? 'tersingkir' : p.chips + ' chip'}</div><div class="rs">${info}</div></div>
        <div class="cards">${p.hand.map((c, k) => card(c, `h${s.hand}-p${i}-${k}`, `data-d="${(k * n + order) * .14}"`)).join('')}</div></div>${bet}`;
    }).join('');

    animate();
    if (label) toast(label);
    renderAct(s);
  }

  function renderAct(s) {
    const a = $('act'), me = s.players[s.me], key = [s.hand, s.stage, s.turn, s.cur, me.chips, s.over].join();
    if (key == actKey) return; actKey = key;
    if (s.turn != s.me || s.over || s.stage > 3) {
      a.innerHTML = `<span class="wt">${s.over ? 'Game selesai' : s.stage == 5 ? 'Ronde selesai — tangan berikutnya segera dibagikan…' : s.turn >= 0 ? 'Menunggu ' + esc(s.players[s.turn].name) + '…' : ''}</span>`; return;
    }
    const toCall = Math.min(s.cur - me.bet, me.chips), max = me.chips + me.bet, min = Math.min(s.cur + s.minR, max);
    a.innerHTML = `<button class="ab fold" id="bf">Fold</button><button class="ab call" id="bc">${toCall ? 'Call ' + toCall : 'Check'}</button>` +
      (max > s.cur ? `<div class="rz"><input id="ri" inputmode="numeric" autocomplete="off" placeholder="${min}" aria-label="Jumlah taruhan"><div class="qk">${['Min', '½ Pot', 'Pot', 'Max'].map((t, i) => `<button data-q="${i}">${t}</button>`).join('')}</div><button class="ab raise" id="br"></button></div><span id="pv"></span>` : '');
    $('bf').onclick = () => cfg.onAction('fold');
    $('bc').onclick = () => cfg.onAction('call');
    if (!$('ri')) return;
    const ri = $('ri'), br = $('br'), pv = $('pv');
    const frac = f => Math.min(max, Math.max(min, Math.round(s.cur + f * (s.pot + toCall))));
    const upd = () => { // angka >= semua chip otomatis menjadi ALL-IN
      const v = parseInt(ri.value) || 0;
      if (v >= max) { br.className = 'ab allin'; br.textContent = 'ALL-IN ' + max; br.disabled = false; pv.textContent = 'Keluar ' + (max - me.bet) + ' chip'; }
      else if (v >= min) { br.className = 'ab raise'; br.textContent = (s.cur ? 'Raise ke ' : 'Bet ') + v; br.disabled = false; pv.textContent = 'Keluar ' + (v - me.bet) + ' chip'; }
      else { br.className = 'ab raise'; br.textContent = s.cur ? 'Raise' : 'Bet'; br.disabled = true; pv.textContent = 'Minimal ' + min; }
    };
    ri.oninput = () => { ri.value = ri.value.replace(/\D/g, '').slice(0, 9); upd(); };
    ri.onkeydown = e => { if (e.key == 'Enter' && !br.disabled) br.click(); };
    a.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { ri.value = [min, frac(.5), frac(1), max][b.dataset.q]; upd(); });
    br.onclick = () => cfg.onAction('raise', Math.min(parseInt(ri.value) || 0, max));
    upd(); if (matchMedia('(pointer:fine)').matches) ri.focus();
  }

  return { init, showRoom, render, setStatus };
})();

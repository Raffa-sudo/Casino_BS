// Tampilan meja Texas Hold'em (landscape): kursi 1–8, animasi kartu, panel aksi. Hanya menggambar state yang diterima.
// Ruang tunggu, status koneksi, dan tombol layar penuh ada di lobby.js.
Poker.UI = (function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SU = ['♠', '♥', '♦', '♣'], RK = ['', '', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const STG = ['Pre-flop', 'Flop', 'Turn', 'River', '', 'Hand over'];
  const TOAST = ['', 'Flop — 3 community cards', 'Turn — community card ke-4', 'River — community card ke-5'];
  const ANG = [125, 160, 200, 235, 305, 340, 20, 55], AX = 41, BY = 38; // sudut kursi di tepi oval (kiri → atas → kanan)
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cfg = { isHost: false, onAction() {}, onNext() {} };
  let seen = new Set(), busy = 0, pending = null, timer = 0, actKey = '', lastHand = -1, lastStage = -1, lastGid = 0, hl = new Set();

  const card = (c, k, extra, board) => {
    if (!c) return `<span class="c b" data-k="${k}" ${extra || ''}></span>`;
    const on = hl.has(c.r + '-' + c.s);
    return `<span class="c ${c.s == 1 || c.s == 2 ? 'r' : ''} ${on ? 'hl' : hl.size && board ? 'dim' : ''}" data-k="${k}" data-up="1" ${extra || ''}>${RK[c.r]}${SU[c.s]}</span>`;
  };
  const stageName = s => s.stage == 5 ? (s.result && s.result.showdown ? 'Showdown' : 'Hand over') : STG[s.stage];
  const cardsTxt = cs => cs.map(c => RK[c.r] + SU[c.s]).join(' ');
  // Panel hasil: siapa menang, dengan hand apa, kartu pembentuknya, dan siapa yang dikalahkan.
  const resultHtml = r => r.pots.map((p, i) => {
    const w = esc(p.winners.join(' & ')), lbl = r.pots.length > 1 ? (i ? ' (Side pot)' : ' (Main pot)') : '';
    if (p.uncontested) return `<div><b>★ ${w} menang ${p.amount} chip</b>Semua lawan fold</div>`;
    return `<div><b>★ ${w} ${p.winners.length > 1 ? 'split pot' : 'menang'} ${p.amount} chip${lbl}</b>${esc(p.hand)}: ${cardsTxt(p.cards)}` +
      (p.beaten.length ? `<div class="bt2">mengalahkan ${p.beaten.map(b => esc(b.name) + ' (' + esc(b.hand) + ')').join(', ')}</div>` : '') + '</div>';
  }).join('');

  function init(c) {
    cfg = c;
    // Mouse-down pada tombol aksi tidak boleh memindahkan fokus: kalau input taruhan sedang fokus, keyboard layar menutup dan
    // tata letak bergeser sebelum tap selesai, sehingga tombol "tidak terasa" ditekan.
    $('act').addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
  }
  // Dipanggil saat kembali ke ruang tunggu: buang semua sisa animasi dan cache tampilan.
  function leave() {
    clearTimeout(timer); pending = null; busy = 0; seen = new Set(); actKey = ''; lastHand = -1; lastStage = -1; hl = new Set();
    $('act').innerHTML = ''; $('result').hidden = true;
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
    if (s.gid != lastGid) { leave(); lastGid = s.gid; } // game baru (Lanjut main): mulai dari nol
    // Panel aksi SELALU mengikuti state terbaru, tidak ikut ditunda animasi. Dulu tombol "basi" tetap tampil
    // beberapa detik dan tap pada tombol itu diabaikan mesin karena bukan giliran lagi.
    renderAct(s);
    // Tunda gambar meja selama animasi kartu masih berjalan (hanya state terbaru yang dipakai).
    if (Date.now() < busy) { pending = s; clearTimeout(timer); timer = setTimeout(() => { const p = pending; pending = null; if (p) render(p); }, busy - Date.now()); return; }
    const n = s.players.length, pos = layout(n, s.me);
    const label = s.hand != lastHand ? 'Hand #' + s.hand + ' — hole cards dibagikan' : (s.stage != lastStage ? TOAST[s.stage] : '');
    lastHand = s.hand; lastStage = s.stage;
    $('hno').textContent = 'Hand #' + s.hand + ' · ' + stageName(s) + ' · Blinds ' + Poker.CONFIG.SB + '/' + Poker.CONFIG.BB;
    $('pot').textContent = 'Pot ' + s.pot;
    hl = new Set(((s.result && s.result.pots[0] && s.result.pots[0].cards) || []).map(c => c.r + '-' + c.s));
    $('msg').textContent = s.log[s.log.length - 1] || ''; $('msg').hidden = !!s.result;
    $('board').innerHTML = Array.from({ length: 5 }, (_, i) => s.board[i] ? card(s.board[i], `h${s.hand}-b${i}`, `data-bi="${i}"`, true) : '<span class="c e"></span>').join('');
    $('burn').innerHTML = Array.from({ length: s.burn }, (_, i) => `<span class="c b" data-k="h${s.hand}-x${i}" data-x="1" data-bi="${i}" style="left:${i * 4}px;top:${i * 3}px"></span>`).join('');
    const over = $('over'); over.hidden = !s.over; if (s.over) over.textContent = 'Pemenang akhir: ' + s.over;

    $('seats').innerHTML = s.players.map((p, i) => {
      const [x, y] = pos[i], cls = y < 30 ? 'top' : y > 70 ? 'bot' : x < 50 ? 'left' : 'right';
      const order = ((i - s.dealer - 1) % n + n) % n; // urutan pembagian: mulai dari kiri dealer
      const tags = (i == s.dealer ? '<span class="tag d">D</span>' : '') + (i == s.sb ? '<span class="tag sb">SB</span>' : '') + (i == s.bb ? '<span class="tag bb">BB</span>' : '');
      const info = p.win ? '★ ' + (p.res || 'Winner') : p.res || (p.out ? '' : p.folded ? 'fold' : p.allin ? 'all-in' : '');
      const bet = p.bet > 0 ? `<span class="bet" style="left:${x + (50 - x) * .45}%;top:${y + (50 - y) * .45}%">${p.bet}</span>` : '';
      return `<div class="seat ${cls} ${i == s.me ? 'me' : ''} ${i == s.turn ? 'turn' : ''} ${p.folded ? 'fold' : ''} ${p.gone ? 'gone' : ''} ${p.win ? 'win' : ''}" style="left:${x}%;top:${y}%">
        <div class="pill"><div class="nm">${esc(p.name)}${tags}</div><div class="ch">${p.gone ? 'Keluar' : p.out ? 'Busted' : p.chips + ' chip'}</div><div class="rs">${info}</div></div>
        <div class="cards">${p.hand.map((c, k) => card(c, `h${s.hand}-p${i}-${k}`, `data-d="${(k * n + order) * .14}"`)).join('')}</div></div>${bet}`;
    }).join('');

    animate();
    const rs = $('result'); rs.hidden = !s.result; // panel hasil muncul setelah animasi kartu selesai
    if (s.result) { rs.innerHTML = resultHtml(s.result); rs.style.animationDelay = Math.max(0, busy - Date.now()) + 'ms'; }
    if (label) toast(label);
  }

  function renderAct(s) {
    const a = $('act'), me = s.players[s.me], key = [s.gid, s.hand, s.stage, s.turn, s.cur, me.chips, me.out, s.over, cfg.isHost].join();
    if (key == actKey) return; actKey = key;
    if (s.over) { // game selesai: tuan rumah memilih berhenti (ke lobby) atau lanjut main dari awal
      a.innerHTML = cfg.isHost
        ? `<span class="wt">Game selesai. Pemenang: <b>${esc(s.over)}</b></span><button class="ab call" id="bagain" title="Reset semua chip ke ${s.startChips} dan mulai dari hand pertama">Lanjut main (${s.startChips} chip)</button><button class="ab fold" id="bstop" title="Kembali ke ruang tunggu; chip awal bisa diatur lagi">Berhenti</button>`
        : `<span class="wt">Game selesai. Pemenang: <b>${esc(s.over)}</b>. Menunggu tuan rumah: lanjut main atau kembali ke lobby…</span>`;
      if (cfg.isHost) { $('bagain').onclick = () => cfg.onNext('again'); $('bstop').onclick = () => cfg.onNext('lobby'); }
      return;
    }
    if (s.turn != s.me || me.out || s.stage > 3) {
      a.innerHTML = `<span class="wt">${me.out ? 'Kamu sudah keluar dari permainan. Menonton…' : s.stage == 5 ? 'Hand selesai — hand berikutnya segera dimulai…' : s.turn >= 0 ? 'Menunggu ' + esc(s.players[s.turn].name) + '…' : ''}</span>`; return;
    }
    const toCall = Math.min(s.cur - me.bet, me.chips), max = me.chips + me.bet, min = Math.min(s.cur + s.minR, max);
    a.innerHTML = `<button class="ab fold" id="bf" title="Fold: menyerah dan keluar dari hand ini">Fold</button><button class="ab call" id="bc" title="${toCall ? 'Call: samakan taruhan terakhir' : 'Check: lanjut tanpa menambah taruhan'}">${toCall ? 'Call ' + toCall : 'Check'}</button>` +
      (max > s.cur ? `<div class="rz"><input id="ri" inputmode="numeric" autocomplete="off" placeholder="${min}" aria-label="Jumlah taruhan"><div class="qk">${['Min', '½ Pot', 'Pot', 'Max'].map((t, i) => `<button data-q="${i}">${t}</button>`).join('')}</div><button class="ab raise" id="br"></button></div><span id="pv"></span>` : '');
    $('bf').onclick = () => cfg.onAction('fold');
    $('bc').onclick = () => cfg.onAction('call');
    if (!$('ri')) return;
    const ri = $('ri'), br = $('br'), pv = $('pv');
    const frac = f => Math.min(max, Math.max(min, Math.round(s.cur + f * (s.pot + toCall))));
    const upd = () => { // angka >= semua chip otomatis menjadi ALL-IN
      const v = parseInt(ri.value) || 0;
      if (v >= max) { br.className = 'ab allin'; br.textContent = 'ALL-IN ' + max; br.disabled = false; pv.textContent = 'Keluar ' + (max - me.bet) + ' chip'; }
      else if (v >= min) { br.className = 'ab raise'; br.textContent = (s.cur ? 'Raise to ' : 'Bet ') + v; br.disabled = false; pv.textContent = 'Keluar ' + (v - me.bet) + ' chip'; }
      else { br.className = 'ab raise'; br.textContent = s.cur ? 'Raise' : 'Bet'; br.disabled = true; pv.textContent = 'Min ' + min; }
    };
    ri.oninput = () => { ri.value = ri.value.replace(/\D/g, '').slice(0, 9); upd(); };
    ri.onkeydown = e => { if (e.key == 'Enter' && !br.disabled) br.click(); };
    a.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { ri.value = [min, frac(.5), frac(1), max][b.dataset.q]; upd(); });
    br.onclick = () => cfg.onAction('raise', Math.min(parseInt(ri.value) || 0, max));
    ri.value = min; upd(); // tombol Raise langsung siap dipakai (sebelumnya mati sampai angka diketik)
    if (matchMedia('(pointer:fine)').matches) { ri.focus(); ri.select(); }
  }

  return { init, leave, render };
})();

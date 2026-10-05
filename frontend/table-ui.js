// Tampilan meja: hanya menggambar state yang diterima dan meneruskan klik pemain.
Poker.UI = (function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SU = ['♠', '♥', '♦', '♣'], RK = ['', '', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const STG = ['Pre-flop', 'Flop', 'Turn', 'River', '', 'Selesai'];
  let cfg = { isHost: false, onStart() {}, onAction() {} }, invite = '';

  const card = c => c ? `<span class="c ${c.s == 1 || c.s == 2 ? 'r' : ''}">${RK[c.r]}${SU[c.s]}</span>` : '<span class="c b"></span>';
  const setStatus = t => $('st').textContent = t;

  function init(c) {
    cfg = c;
    $('startBtn').onclick = () => cfg.onStart();
    $('cp').onclick = () => {
      (navigator.clipboard ? navigator.clipboard.writeText(invite) : Promise.reject())
        .then(() => setStatus('Tautan disalin.')).catch(() => setStatus(invite));
    };
  }

  function showRoom(code, isHost, inviteUrl) {
    invite = inviteUrl || '';
    $('room').hidden = false; $('rc').textContent = code;
    $('shr').hidden = !isHost; $('wait').hidden = isHost;
  }

  function render(s) {
    $('lobby').hidden = s.started; $('game').hidden = !s.started;
    if (!s.started) {
      $('plist').innerHTML = s.players.map(p => `<li>${esc(p.name)}</li>`).join('');
      $('startBtn').hidden = !cfg.isHost || s.players.length < 2; return;
    }
    const me = s.players[s.me];
    $('stage').textContent = STG[s.stage]; $('pot').textContent = 'Pot: ' + s.pot;
    $('board').innerHTML = Array.from({ length: 5 }, (_, i) => s.board[i] ? card(s.board[i]) : '<span class="c e"></span>').join('');
    $('pls').innerHTML = s.players.map((p, i) => `<div class="pl ${i == s.turn ? 'turn' : ''} ${p.folded ? 'fold' : ''} ${i == s.me ? 'me' : ''}">
      <div class="nm">${esc(p.name)}${i == s.dealer ? '<span class="tag">D</span>' : ''}</div>
      <div class="ch">${p.out ? 'tersingkir' : p.chips + ' chip'}</div>
      <div class="bt">${p.folded && !p.out ? 'fold' : p.allin ? 'all-in' : p.bet ? 'taruhan ' + p.bet : ''}</div>
      <div>${p.hand.map(card).join('')}</div><div class="res">${esc(p.res || '')}</div></div>`).join('');
    $('log').innerHTML = s.log.map(l => `<div>${esc(l)}</div>`).join('');
    const o = $('over'); o.hidden = !s.over; if (s.over) o.textContent = 'Pemenang akhir: ' + s.over;

    const a = $('act');
    if (s.turn != s.me || s.over) { a.hidden = true; a.innerHTML = ''; return; }
    const call = Math.min(s.cur - me.bet, me.chips), max = me.chips + me.bet, min = Math.min(s.cur + s.minR, max);
    a.hidden = false;
    a.innerHTML = `<div class="row"><button class="sec" id="bf">Fold</button><button id="bc">${call ? 'Call ' + call : 'Check'}</button><button class="sec" id="ba">All-in ${max}</button></div>
      ${max > s.cur && min < max ? `<div class="row"><input type="range" id="rg" min="${min}" max="${max}" step="${Poker.CONFIG.BB / 2}" value="${min}"><button id="br">${s.cur ? 'Raise ke ' : 'Bet '}<span id="rv">${min}</span></button></div>` : ''}`;
    $('bf').onclick = () => cfg.onAction('fold');
    $('bc').onclick = () => cfg.onAction('call');
    $('ba').onclick = () => cfg.onAction('raise', max);
    if ($('rg')) { $('rg').oninput = e => $('rv').textContent = e.target.value; $('br').onclick = () => cfg.onAction('raise', $('rg').value); }
  }

  return { init, showRoom, render, setStatus };
})();

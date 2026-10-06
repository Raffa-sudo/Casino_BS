// Ruang tunggu + elemen bersama semua meja: daftar pemain, chip awal, tombol mulai, layar penuh,
// dan banner koneksi (terlihat juga saat bermain; dulu pesan koneksi ditulis ke elemen yang tersembunyi).
Casino.Lobby = (function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let cfg = { isHost: false, game: 'holdem', minPlayers: 2, onStart() {}, onChips() {} }, invite = '';

  const setStatus = t => { $('st').textContent = t || ''; };

  function init(c) {
    cfg = c;
    $('startBtn').onclick = () => cfg.onStart();
    $('chipsBtn').onclick = () => cfg.onChips($('chipsIn').value);
    $('chipsIn').oninput = () => $('chipsIn').value = $('chipsIn').value.replace(/\D/g, '').slice(0, 7);
    $('chipsIn').onkeydown = e => { if (e.key == 'Enter') $('chipsBtn').click(); };
    document.querySelectorAll('.gd').forEach(b => b.onclick = () => Casino.Guide.open(cfg.game));
    $('cp').onclick = () => (navigator.clipboard ? navigator.clipboard.writeText(invite) : Promise.reject())
      .then(() => setStatus('Tautan disalin.')).catch(() => setStatus(invite));
    document.querySelectorAll('.fs').forEach(b => b.onclick = () => {
      const d = document.documentElement;
      (d.requestFullscreen ? d.requestFullscreen() : Promise.reject())
        .then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape')).catch(() => {});
    });
    $('netBtn').onclick = () => location.reload();
  }

  function showRoom(code, isHost, inviteUrl) {
    invite = inviteUrl || ''; $('room').hidden = false; $('rc').textContent = code;
    $('shr').hidden = !isHost; $('wait').hidden = isHost;
  }

  // Banner koneksi di atas layar. retry=true menampilkan tombol "Gabung ulang" (muat ulang halaman = join lagi dengan nama yang sama).
  function netLost(msg, retry) {
    $('netMsg').textContent = msg; $('netBtn').hidden = !retry; $('net').hidden = false;
    document.querySelectorAll('#game button.ab').forEach(b => { b.disabled = true; });
  }
  const netOk = () => { $('net').hidden = true; };

  const enterGame = () => { document.body.classList.add('playing'); $('lobby').hidden = true; $('game').hidden = false; };

  // Gambar ruang tunggu dari state yang diterima.
  function render(s) {
    document.body.classList.remove('playing'); $('lobby').hidden = false; $('game').hidden = true;
    $('plist').innerHTML = s.players.map((p, i) => `<li>${esc(p.name)}${i == 0 ? ' <small>(tuan rumah)</small>' : ''}${i == s.me ? ' <small>(kamu)</small>' : ''}</li>`).join('');
    $('startBtn').hidden = !cfg.isHost || s.players.length < cfg.minPlayers;
    $('chipsRow').hidden = !cfg.isHost; $('chipsInfo').hidden = cfg.isHost; $('chipsInfo').textContent = 'Chip awal tiap pemain: ' + s.startChips;
    if (document.activeElement != $('chipsIn')) $('chipsIn').value = s.startChips;
  }

  return { init, showRoom, render, enterGame, setStatus, netLost, netOk };
})();

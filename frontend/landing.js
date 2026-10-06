// Halaman utama Virtual Casino: pilih game, kumpulkan nama + kode meja, lalu pindah ke halaman meja game itu.
(function () {
  const $ = id => document.getElementById(id);
  const say = t => $('st').textContent = t;
  const GAMES = Casino.CONFIG.GAMES, q = new URLSearchParams(location.search);
  let game = 'holdem';

  try { $('name').value = localStorage.getItem('casino-name') || localStorage.getItem('holdem-name') || ''; game = localStorage.getItem('casino-game') || game; } catch (e) {}
  if (q.get('g') in GAMES) game = q.get('g');       // tautan undangan membawa game-nya
  if (!(game in GAMES)) game = 'holdem';
  if (q.get('r')) $('code').value = q.get('r').toUpperCase();

  function pick(g) {
    game = g; try { localStorage.setItem('casino-game', g); } catch (e) {}
    document.querySelectorAll('.gm').forEach(b => b.setAttribute('aria-pressed', b.dataset.g == g));
    $('gd').textContent = 'Guide: cara bermain ' + GAMES[g].title;
    $('mk').textContent = 'Buat meja ' + GAMES[g].title;
    say('');
  }
  document.querySelectorAll('.gm').forEach(b => b.onclick = () => pick(b.dataset.g));
  pick(game);

  function go(params) {
    const name = $('name').value.trim();
    if (!name) { say('Isi nama dulu.'); $('name').focus(); return; }
    try { localStorage.setItem('casino-name', name); } catch (e) {}
    location.href = GAMES[game].dir + '?' + new URLSearchParams({ name, ...params });
  }

  $('gd').onclick = () => Casino.Guide.open(game);
  $('mk').onclick = () => go({ mode: 'host' });
  $('jn').onclick = () => {
    const code = $('code').value.trim().toUpperCase();
    if (code.length < 5) { say('Masukkan kode 5 karakter.'); return; }
    go({ mode: 'join', code });
  };
})();

// Halaman utama: kumpulkan nama + pilihan, lalu pindah ke halaman meja.
(function () {
  const $ = id => document.getElementById(id);
  const say = t => $('st').textContent = t;

  try { $('name').value = localStorage.getItem('holdem-name') || ''; } catch (e) {}
  const invited = new URLSearchParams(location.search).get('r');
  if (invited) $('code').value = invited.toUpperCase();

  function go(params) {
    const name = $('name').value.trim();
    if (!name) { say('Isi nama dulu.'); $('name').focus(); return; }
    try { localStorage.setItem('holdem-name', name); } catch (e) {}
    location.href = 'table/?' + new URLSearchParams({ name, ...params });
  }

  $('mk').onclick = () => go({ mode: 'host' });
  $('jn').onclick = () => {
    const code = $('code').value.trim().toUpperCase();
    if (code.length < 5) { say('Masukkan kode 5 karakter.'); return; }
    go({ mode: 'join', code });
  };
})();

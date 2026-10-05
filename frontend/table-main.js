// Penghubung halaman meja: membaca parameter URL lalu menyambungkan UI <-> mesin game <-> jaringan.
(function () {
  const q = new URLSearchParams(location.search);
  const mode = q.get('mode'), name = (q.get('name') || '').trim().slice(0, 14);
  if (!name || (mode != 'host' && mode != 'join')) { location.replace('../index.html'); return; }
  const UI = Poker.UI;

  if (mode == 'host') {
    const code = Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.random() * 32 | 0]).join('');
    const invite = new URL('../index.html?r=' + code, location.href).href;

    const engine = Poker.createEngine(() => {
      UI.render(engine.view(0));
      engine.players().forEach((p, i) => { if (i) net.sendTo(p.id, { t: 'state', s: engine.view(i) }); });
    });
    UI.init({ isHost: true, onStart: () => engine.start(), onAction: (a, amt) => engine.act(0, a, amt) });

    const net = Poker.Net.host(code, {
      onOpen() { UI.setStatus(''); UI.showRoom(code, true, invite); engine.addPlayer('host', name); },
      onJoin: (id, n) => engine.addPlayer(id, n),
      onAct: (id, a, amt) => engine.actById(id, a, amt),
      onLeave: id => engine.removePlayer(id),
      onError: t => UI.setStatus(t == 'unavailable-id' ? 'Kode bentrok, muat ulang halaman.' : 'Gagal: ' + t)
    });
  } else {
    const code = (q.get('code') || '').toUpperCase();
    UI.init({ isHost: false, onAction: (a, amt) => net.sendAction(a, amt) });
    UI.setStatus('Menyambung…');
    const net = Poker.Net.join(code, name, {
      onOpen() { UI.setStatus(''); UI.showRoom(code, false); },
      onState: s => UI.render(s),
      onError: m => UI.setStatus(m),
      onClose: () => UI.setStatus('Koneksi ke tuan rumah terputus.')
    });
  }
})();

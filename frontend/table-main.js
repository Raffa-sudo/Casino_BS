// Penghubung halaman meja (semua game): baca parameter URL lalu sambungkan UI <-> mesin game <-> jaringan.
// Dipakai oleh holdem/index.html dan blackjack/index.html:  Casino.runTable('holdem', Poker.createEngine, Poker.UI)
Casino.runTable = function (game, createEngine, UI, gameCfg) {
  const q = new URLSearchParams(location.search), L = Casino.Lobby, info = Casino.CONFIG.GAMES[game];
  const mode = q.get('mode'), name = (q.get('name') || '').trim().slice(0, 14);
  if (!name || (mode != 'host' && mode != 'join')) { location.replace('../index.html'); return; }

  const show = s => { if (s.started) { L.enterGame(); UI.render(s); } else { UI.leave(); L.render(s); } };
  const chipsMsg = 'Chip awal harus antara ' + gameCfg.MIN_CHIPS + ' dan 1.000.000.';

  if (mode == 'host') {
    const code = Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.random() * 32 | 0]).join('');
    const invite = new URL('../index.html?g=' + game + '&r=' + code, location.href).href;
    let net = null;

    const engine = createEngine(() => {
      show(engine.view(0));
      if (net) engine.players().forEach((p, i) => { if (i && !p.gone) net.sendTo(p.id, { t: 'state', s: engine.view(i) }); });
    });
    L.init({ isHost: true, game, minPlayers: gameCfg.MIN_PLAYERS, onStart: () => engine.start(),
      onChips: n => L.setStatus(engine.setStartChips(n) ? '' : chipsMsg) });
    UI.init({ isHost: true,
      onAction: (a, amt) => engine.actById('host', a, amt),
      onNext: m => { if (engine.reset(m) != m) L.setStatus('Pemain kurang untuk lanjut, kembali ke ruang tunggu.'); else L.setStatus(''); },
      onEnd: () => engine.endSession && engine.endSession() });
    L.setStatus('Menyiapkan meja…');

    net = Casino.Net.host(game, code, {
      onOpen() { L.setStatus(''); L.showRoom(code, true, invite); engine.addPlayer('host', name); },
      onJoin: (id, n) => engine.addPlayer(id, n),
      onAct: (id, a, amt) => engine.actById(id, a, amt),
      onLeave: id => engine.removePlayer(id), // dipanggil saat pemain menutup, atau tak ada kabar melewati batas waktu
      onError: t => { if (t == 'unavailable-id') L.setStatus('Kode bentrok, muat ulang halaman.'); else if (t == 'network' || t == 'server-error' || t == 'socket-error' || t == 'socket-closed') L.netLost('Server perantara (PeerJS) bermasalah: ' + t + '. Pemain baru belum bisa bergabung.', false); else L.setStatus('Gagal: ' + t); }
    });
  } else {
    const code = (q.get('code') || '').toUpperCase();
    let shown = false;
    L.init({ isHost: false, game, minPlayers: gameCfg.MIN_PLAYERS });
    const net = Casino.Net.join(game, code, name, {
      onOpen() { L.setStatus('Bergabung ke meja…'); },
      onState: s => { if (!shown) { shown = true; L.setStatus(''); L.showRoom(code, false); } L.netOk(); show(s); },
      onError: m => L.setStatus(m),
      onClose: why => {
        if (why == 'fatal') return; // alasannya sudah tampil lewat onError (meja penuh, tidak ditemukan, dst.)
        L.netLost(why == 'host-left' ? 'Tuan rumah menutup meja.' : 'Koneksi ke tuan rumah terputus.', why != 'host-left');
      }
    });
    UI.init({ isHost: false, onAction: (a, amt) => { if (!net.sendAction(a, amt)) L.netLost('Koneksi ke tuan rumah terputus.', true); } });
    L.setStatus('Menyambung…');
  }
};

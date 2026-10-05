// Lapisan jaringan peer-to-peer (PeerJS). Tidak tahu apa-apa soal aturan poker.
Poker.Net = {
  // Tuan rumah: menerima koneksi pemain. Handler: onOpen, onError(type), onJoin(id,name)->pesan error|null, onAct(id,a,amt), onLeave(id)
  host(code, h) {
    const peer = new Peer(Poker.CONFIG.ID_PREFIX + code), conns = {};
    peer.on('open', () => h.onOpen());
    peer.on('error', e => h.onError(e.type));
    peer.on('connection', c => {
      c.on('data', d => {
        if (d.t == 'join') {
          conns[c.peer] = c; // didaftarkan dulu agar langsung menerima state
          const err = h.onJoin(c.peer, String(d.name || 'Pemain').slice(0, 14));
          if (err) { delete conns[c.peer]; c.send({ t: 'err', m: err }); }
        } else if (d.t == 'act' && conns[c.peer]) h.onAct(c.peer, d.a, d.amt);
      });
      c.on('close', () => { if (conns[c.peer]) { delete conns[c.peer]; h.onLeave(c.peer); } });
    });
    return { sendTo(id, msg) { const c = conns[id]; if (c && c.open) c.send(msg); } };
  },

  // Pemain: menyambung ke meja. Handler: onOpen, onState(s), onError(msg), onClose
  join(code, name, h) {
    const peer = new Peer(); let conn;
    peer.on('open', () => {
      conn = peer.connect(Poker.CONFIG.ID_PREFIX + code, { reliable: true });
      conn.on('open', () => { conn.send({ t: 'join', name }); h.onOpen(); });
      conn.on('data', d => { if (d.t == 'state') h.onState(d.s); else if (d.t == 'err') h.onError(d.m); });
      conn.on('close', () => h.onClose());
    });
    peer.on('error', e => h.onError(e.type == 'peer-unavailable' ? 'Meja tidak ditemukan.' : 'Gagal: ' + e.type));
    return { sendAction(a, amt) { if (conn && conn.open) conn.send({ t: 'act', a, amt }); } };
  }
};

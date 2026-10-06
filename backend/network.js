// Lapisan jaringan peer-to-peer (PeerJS). Tidak tahu apa-apa soal aturan game.
//
// Pesan: join{name} act{a,amt} ping bye   (pemain -> tuan rumah)
//        state{s} err{m} pong bye          (tuan rumah -> pemain)
//
// Kenapa ada ping/pong: event `close` milik PeerJS sering TIDAK muncul saat perangkat mati, sinyal hilang,
// atau tab ditutup paksa, sehingga pemain yang sudah pergi tetap dianggap bermain. Di sini tuan rumah
// memakai batas waktu sendiri (Casino.CONFIG.TIMEOUT_MS): tidak ada kabar = pemain dianggap keluar.
Casino.Net = (function () {
  const cfg = () => Casino.CONFIG, peerOpts = () => cfg().PEER;
  const idOf = (game, code) => cfg().GAMES[game].prefix + code;
  const safe = f => { try { return f(); } catch (e) {} };

  return {
    // Tuan rumah. Handler: onOpen, onError(type), onJoin(id,name)->pesan error|null, onAct(id,a,amt), onLeave(id)
    host(game, code, h) {
      const peer = new Peer(idOf(game, code), peerOpts()), conns = {}; // id -> { c, seen }
      let stopped = false;
      const drop = (id, c) => {
        const e = conns[id]; if (!e || (c && e.c !== c)) return;
        delete conns[id]; safe(() => e.c.close()); h.onLeave(id);
      };
      peer.on('open', () => h.onOpen());
      peer.on('error', e => h.onError(e.type));
      peer.on('disconnected', () => { if (!stopped) safe(() => peer.reconnect()); }); // putus dari server sinyal; koneksi pemain tetap hidup
      peer.on('connection', c => {
        const sweepNew = setTimeout(() => { if (!conns[c.peer] || conns[c.peer].c !== c) safe(() => c.close()); }, 10000); // sambungan yang tak pernah "join"
        c.on('data', d => {
          if (!d || typeof d != 'object') return;
          const e = conns[c.peer], mine = e && e.c === c;
          if (mine) e.seen = Date.now();
          if (d.t == 'join') {
            if (mine) return;
            conns[c.peer] = { c, seen: Date.now() }; // didaftarkan dulu agar langsung menerima state
            const err = h.onJoin(c.peer, String(d.name || 'Pemain').trim().slice(0, 14) || 'Pemain');
            if (err) { delete conns[c.peer]; safe(() => c.send({ t: 'err', m: err })); setTimeout(() => safe(() => c.close()), 400); }
          } else if (!mine) return;
          else if (d.t == 'act') h.onAct(c.peer, d.a, d.amt);
          else if (d.t == 'ping') safe(() => c.send({ t: 'pong' }));
          else if (d.t == 'bye') drop(c.peer, c);
        });
        c.on('close', () => { clearTimeout(sweepNew); drop(c.peer, c); });
        c.on('error', () => drop(c.peer, c));
      });
      const sweep = setInterval(() => {
        const now = Date.now();
        Object.keys(conns).forEach(id => { if (now - conns[id].seen > cfg().TIMEOUT_MS) drop(id); });
      }, 1000);
      addEventListener('pagehide', () => { Object.values(conns).forEach(e => safe(() => e.c.send({ t: 'bye' }))); });
      return {
        sendTo(id, msg) { const e = conns[id]; if (e && e.c.open) safe(() => e.c.send(msg)); },
        stop() { stopped = true; clearInterval(sweep); safe(() => peer.destroy()); }
      };
    },

    // Pemain. Handler: onOpen, onState(s), onError(msg), onClose(reason)  reason: 'host-left' | 'timeout' | 'closed' | 'fatal'
    join(game, code, name, h) {
      const peer = new Peer(undefined, peerOpts());
      let conn, lastRx = Date.now(), ticker = 0, done = false, failed = false;
      const shut = reason => {
        if (done) return; done = true; clearInterval(ticker);
        safe(() => conn && conn.close()); safe(() => peer.destroy());
        h.onClose(failed ? 'fatal' : reason);
      };
      peer.on('open', () => {
        conn = peer.connect(idOf(game, code), { reliable: true });
        conn.on('open', () => {
          lastRx = Date.now(); conn.send({ t: 'join', name }); h.onOpen();
          ticker = setInterval(() => {
            if (!conn.open) return shut('closed');
            if (Date.now() - lastRx > cfg().TIMEOUT_MS) return shut('timeout');
            safe(() => conn.send({ t: 'ping' }));
          }, cfg().PING_MS);
        });
        conn.on('data', d => {
          if (!d || typeof d != 'object') return;
          lastRx = Date.now();
          if (d.t == 'state') h.onState(d.s);
          else if (d.t == 'err') { failed = true; h.onError(d.m); }
          else if (d.t == 'bye') shut('host-left');
        });
        conn.on('close', () => shut('closed'));
        conn.on('error', () => shut('closed'));
      });
      peer.on('disconnected', () => { if (!done) safe(() => peer.reconnect()); });
      peer.on('error', e => {
        if (e.type == 'peer-unavailable') { failed = true; h.onError('Meja tidak ditemukan.'); shut('fatal'); }
        else if (e.type != 'disconnected') h.onError('Gagal: ' + e.type);
      });
      addEventListener('pagehide', () => { if (!done) safe(() => conn.send({ t: 'bye' })); });
      return {
        sendAction(a, amt) { if (done || !conn || !conn.open) return false; return safe(() => { conn.send({ t: 'act', a, amt }); return true; }) || false; },
        alive: () => !done && !!conn && conn.open,
        leave() { safe(() => conn.send({ t: 'bye' })); shut('closed'); }
      };
    }
  };
})();

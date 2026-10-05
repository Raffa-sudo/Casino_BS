// Guide / tutorial untuk pemula (modal). Dipakai di halaman utama dan halaman meja.
window.Poker = window.Poker || {};
Poker.Guide = (function () {
  const C = t => t.split(' ').map(x => `<span class="gc ${/[♥♦]/.test(x) ? 'r' : ''}">${x}</span>`).join('');
  const RANKS = [
    ['Royal Flush', 'A♠ K♠ Q♠ J♠ 10♠', '10-J-Q-K-A dengan suit sama.'],
    ['Straight Flush', '9♥ 8♥ 7♥ 6♥ 5♥', '5 kartu berurutan, suit sama.'],
    ['Four of a Kind', 'K♠ K♥ K♦ K♣ 4♠', '4 kartu dengan angka sama.'],
    ['Full House', 'Q♠ Q♥ Q♦ 8♣ 8♠', 'Three of a Kind + One Pair.'],
    ['Flush', 'A♦ J♦ 9♦ 6♦ 3♦', '5 kartu suit sama, tidak harus berurutan.'],
    ['Straight', '9♠ 8♥ 7♦ 6♣ 5♠', '5 kartu berurutan, suit bebas (A boleh rendah: A-2-3-4-5).'],
    ['Three of a Kind', '7♠ 7♥ 7♦ K♣ 2♠', '3 kartu angka sama.'],
    ['Two Pair', 'J♠ J♥ 4♦ 4♣ A♠', 'Dua pasang angka sama.'],
    ['One Pair', '10♠ 10♥ A♦ 8♣ 3♠', 'Sepasang angka sama.'],
    ['High Card', 'A♠ J♥ 8♦ 5♣ 2♠', 'Tidak ada kombinasi; kartu tertinggi yang menentukan.']];
  const PAGES = [
    ['1. Tujuan permainan', `<p>Kamu mendapat <b>2 kartu tertutup</b> (<b>hole cards</b>). Lima kartu lain, yaitu <b>community cards</b>, dibuka bertahap di tengah meja dan dipakai bersama semua pemain.</p>
      <p>Bentuk <b>hand</b> 5 kartu terbaik dari 7 kartu (2 milikmu + 5 di meja). Pemain dengan hand terbaik saat <b>showdown</b> memenangkan <b>pot</b>. Kamu juga menang langsung kalau semua lawan <b>fold</b>.</p>
      <p>Semua pemain mulai dengan jumlah chip yang sama. Chip hanya mainan; pemain terakhir yang masih punya chip menang.</p>`],
    ['2. Alur satu hand', `<ol><li><b>Blinds</b>: dua pemain wajib memasang taruhan paksa agar selalu ada pot.</li>
      <li><b>Pre-flop</b>: dealer membagikan 2 hole cards, lalu putaran taruhan pertama.</li>
      <li><b>Flop</b>: 3 community cards dibuka, lalu taruhan.</li>
      <li><b>Turn</b>: kartu ke-4 dibuka, lalu taruhan.</li>
      <li><b>River</b>: kartu ke-5 dibuka, lalu taruhan terakhir.</li>
      <li><b>Showdown</b>: pemain yang tersisa membuka kartu; hand terbaik menang.</li></ol>
      <p>Sebelum Flop, Turn, dan River, dealer membuang 1 kartu (<b>burn card</b>) agar kartu berikutnya tidak bisa ditebak.</p>`],
    ['3. Aksi saat gilirannmu', `<ul><li><b>Fold</b>: menyerah. Chip yang sudah kamu masukkan ke pot hilang.</li>
      <li><b>Check</b>: lanjut tanpa membayar. Hanya bisa kalau belum ada yang bet di putaran itu.</li>
      <li><b>Call</b>: menyamakan taruhan terakhir. Jumlahnya otomatis.</li>
      <li><b>Bet / Raise</b>: menaikkan taruhan. Ketik <b>total taruhanmu</b> di kolom, atau pakai Min, ½ Pot, Pot, Max. Kenaikan minimal sama dengan kenaikan sebelumnya.</li>
      <li><b>All-in</b>: mempertaruhkan semua chip. Kalau angka yang diketik sama dengan atau lebih dari chip-mu, tombol otomatis berubah menjadi ALL-IN.</li></ul>
      <p>Putaran taruhan selesai saat semua pemain yang bertahan sudah menyamakan taruhan. Kalau ada yang all-in dengan chip lebih sedikit, dibuat <b>side pot</b>: ia hanya bisa memenangkan sebesar chip yang ia pasang.</p>`],
    ['4. Posisi dan blinds', `<ul><li><b>D (Dealer button)</b>: penanda dealer, berpindah searah jarum jam tiap hand.</li>
      <li><b>SB (Small Blind)</b>: pemain setelah D, wajib pasang 10.</li>
      <li><b>BB (Big Blind)</b>: pemain setelah SB, wajib pasang 20.</li>
      <li>Pre-flop, giliran mulai dari pemain setelah BB. Setelah Flop, mulai dari pemain pertama setelah D.</li>
      <li>Heads-up (2 pemain): D sekaligus SB.</li>
      <li>Pemain yang chip-nya habis jadi <b>Busted</b> dan keluar dari permainan.</li></ul>`],
    ['5. Peringkat hand', '<p>Dari tertinggi ke terendah:</p>' + RANKS.map((r, i) => `<div class="rk"><b>${i + 1}. ${r[0]}</b><span>${C(r[1])}</span><small>${r[2]}</small></div>`).join('')],
    ['6. Tips dan cara membaca layar', `<ul><li>Di akhir hand, <b>5 kartu emas bercahaya</b> adalah kartu pembentuk hand pemenang. Kartu meja lain diredupkan. Panel di tengah menjelaskan hand-nya dan siapa yang dikalahkan.</li>
      <li><b>Kicker</b>: kalau dua hand sejenis (misal sama-sama One Pair), kartu tertinggi di sisa kartu yang menentukan.</li>
      <li>Tidak ada suit yang lebih kuat. Kalau hand sama persis, pot dibagi (<b>split pot</b>).</li>
      <li>Pemula: mainkan hole cards yang kuat (pasangan, atau A/K), <b>Check</b> kalau gratis, dan jangan <b>Call</b> besar tanpa hand bagus.</li>
      <li>Tombol <b>Guide</b> tersedia kapan saja, juga saat bermain.</li></ul>`]];

  function open(start) {
    let i = start || 0; const old = document.getElementById('guide'); if (old) old.remove();
    const m = document.createElement('div'); m.id = 'guide'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', 'Guide');
    const close = () => { m.remove(); document.removeEventListener('keydown', key); };
    const key = e => { if (e.key == 'Escape') close(); };
    const draw = () => {
      m.innerHTML = `<div class="gbox"><div class="gh"><b>${PAGES[i][0]}</b><span>${i + 1}/${PAGES.length}</span><button class="sec gx" aria-label="Tutup">✕</button></div>
        <div class="gb">${PAGES[i][1]}</div><div class="gf"><button class="sec" id="gp" ${i ? '' : 'disabled'}>‹ Kembali</button><button id="gn">${i < PAGES.length - 1 ? 'Lanjut ›' : 'Selesai'}</button></div></div>`;
      m.querySelector('.gx').onclick = close;
      m.querySelector('#gp').onclick = () => { i--; draw(); };
      m.querySelector('#gn').onclick = () => { if (i < PAGES.length - 1) { i++; draw(); } else close(); };
    };
    m.onclick = e => { if (e.target == m) close(); };
    document.addEventListener('keydown', key); draw(); document.body.appendChild(m);
  }
  return { open };
})();

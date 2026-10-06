// Guide / tutorial untuk pemula (modal), satu set halaman per game. Dipakai di halaman utama dan halaman meja.
window.Casino = window.Casino || {};
Casino.Guide = (function () {
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
  const HOLDEM = [
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
      <li>Tombol <b>Guide</b> tersedia kapan saja, juga saat bermain.</li>
      <li>Di akhir game, tuan rumah memilih <b>Lanjut main</b> (semua chip dikembalikan ke chip awal) atau <b>Berhenti</b> (kembali ke ruang tunggu, chip awal bisa diubah).</li></ul>`]];

  const BLACKJACK = [
    ['1. Tujuan permainan', `<p>Kamu melawan <b>dealer</b>, bukan melawan pemain lain. Kumpulkan kartu dengan total <b>sedekat mungkin ke 21 tanpa melewatinya</b>. Lewat dari 21 disebut <b>bust</b> dan langsung kalah.</p>
      <p>Nilai kartu: 2–10 sesuai angkanya, <b>J, Q, K = 10</b>, dan <b>As = 11</b> (otomatis jadi 1 kalau 11 membuatmu bust). Hand yang berisi As dan masih aman disebut <b>soft</b>; layar menampilkan dua kemungkinan totalnya, misalnya <b>7/17</b> (As dihitung 1 atau 11).</p>
      <p>Tuan rumah mengatur chip awal. Chip hanya mainan, tanpa uang sungguhan.</p>`],
    ['2. Alur satu ronde', `<ol><li><b>Taruhan</b>: semua pemain memasang taruhan sebelum kartu dibagi (ada batas waktu). Tidak mau ikut? Tekan <b>Lewati ronde</b>.</li>
      <li><b>Pembagian</b>: tiap pemain mendapat 2 kartu terbuka. Dealer mendapat 2 kartu: satu terbuka, satu <b>tertutup</b> (hole card).</li>
      <li><b>Giliran pemain</b>: dari kursi paling kiri ke kanan. Kamu mengambil keputusan sampai selesai atau bust.</li>
      <li><b>Giliran dealer</b>: dealer membuka hole card lalu menarik kartu sesuai aturan tetap.</li>
      <li><b>Hasil</b>: hand dibandingkan dengan dealer dan chip dibayarkan. Ronde berikutnya mulai otomatis.</li></ol>`],
    ['3. Aksi saat gilirannmu', `<ul><li><b>Hit</b>: minta 1 kartu lagi.</li>
      <li><b>Stand</b>: cukup, tidak minta kartu lagi.</li>
      <li><b>Double</b>: hanya pada 2 kartu pertama. Taruhan digandakan, kamu menerima <b>tepat 1 kartu</b> lalu otomatis Stand.</li>
      <li><b>Split</b>: kalau 2 kartu pertamamu bernilai sama (misal 8 dan 8, atau K dan 10), pisahkan menjadi dua hand dengan taruhan masing-masing sebesar taruhan awal. Maksimal 4 hand. Split As hanya mendapat 1 kartu per hand dan tidak bisa di-split lagi.</li></ul>
      <p>Batas waktu tiap giliran 30 detik. Kalau lewat, kamu otomatis <b>Stand</b>. Tombol yang tidak tersedia (misalnya Double saat chip kurang) tidak ditampilkan.</p>`],
    ['4. Dealer dan pembayaran', `<ul><li>Dealer <b>wajib Hit sampai total 17</b> dan <b>berhenti di semua 17</b>, termasuk soft 17.</li>
      <li><b>Blackjack</b> = As + kartu bernilai 10 sebagai 2 kartu pertama. Dibayar <b>3:2</b> (taruhan 100 menang 150). 21 hasil Split bukan Blackjack.</li>
      <li><b>Menang</b> (totalmu lebih tinggi, atau dealer bust): dibayar <b>1:1</b>.</li>
      <li><b>Push</b> (sama dengan dealer): taruhan dikembalikan.</li>
      <li><b>Kalah</b> (bust atau lebih rendah dari dealer): taruhan hilang.</li>
      <li>Kalau kartu terbuka dealer As atau bernilai 10, dealer langsung <b>mengintip</b> hole card. Jika dealer Blackjack, ronde berakhir saat itu juga: kamu kalah kecuali kamu juga Blackjack (push).</li>
      <li>Tidak ada insurance dan surrender di meja ini.</li></ul>`],
    ['5. Tips dan akhir sesi', `<ul><li>Pemula: <b>Stand</b> di 17 ke atas, <b>Hit</b> di 11 ke bawah, <b>Double</b> di 10 atau 11 saat kartu terbuka dealer lemah (2–6), selalu <b>Split</b> As dan 8, jangan pernah Split 10.</li>
      <li>Kartu terbuka dealer 2–6 lemah (dealer sering bust); 7–A kuat.</li>
      <li>Pemain yang chip-nya kurang dari taruhan minimum jadi <b>Busted</b> dan hanya menonton.</li>
      <li>Tuan rumah bisa menekan <b>Akhiri sesi</b> kapan saja (berlaku setelah ronde yang sedang berjalan). Papan skor muncul, lalu tuan rumah memilih <b>Lanjut main</b> (semua chip kembali ke chip awal) atau <b>Berhenti</b> (kembali ke ruang tunggu, chip awal bisa diubah).</li>
      <li>Sepatu berisi 6 dek dan dikocok ulang otomatis saat sisanya tinggal sedikit.</li></ul>`]];
  const PAGES = { holdem: HOLDEM, blackjack: BLACKJACK };

  function open(game, start) {
    const PG = PAGES[game] || HOLDEM; let i = start || 0; const old = document.getElementById('guide'); if (old) old.remove();
    const m = document.createElement('div'); m.id = 'guide'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', 'Guide');
    const close = () => { m.remove(); document.removeEventListener('keydown', key); };
    const key = e => { if (e.key == 'Escape') close(); };
    const draw = () => {
      m.innerHTML = `<div class="gbox"><div class="gh"><b>${PG[i][0]}</b><span>${i + 1}/${PG.length}</span><button class="sec gx" aria-label="Tutup">✕</button></div>
        <div class="gb">${PG[i][1]}</div><div class="gf"><button class="sec" id="gp" ${i ? '' : 'disabled'}>‹ Kembali</button><button id="gn">${i < PG.length - 1 ? 'Lanjut ›' : 'Selesai'}</button></div></div>`;
      m.querySelector('.gx').onclick = close;
      m.querySelector('#gp').onclick = () => { i--; draw(); };
      m.querySelector('#gn').onclick = () => { if (i < PG.length - 1) { i++; draw(); } else close(); };
    };
    m.onclick = e => { if (e.target == m) close(); };
    document.addEventListener('keydown', key); draw(); document.body.appendChild(m);
  }
  return { open };
})();

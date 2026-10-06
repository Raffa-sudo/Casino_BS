// Pengaturan Virtual Casino. Ubah angka di sini untuk menyesuaikan aturan meja.
window.Casino = window.Casino || {};
window.Poker = window.Poker || {};
window.Blackjack = window.Blackjack || {};

// Umum (semua game)
Casino.CONFIG = {
  NAME: 'Virtual Casino',
  PEER: undefined,        // opsi PeerJS (host/port/path/config). Kosong = server publik PeerJS.
  PING_MS: 2000,          // pemain mengirim "ping" ke tuan rumah tiap sekian ms
  TIMEOUT_MS: 9000,       // tuan rumah menganggap pemain keluar jika tak ada kabar selama ini
  GAMES: {                // id game -> awalan ID peer + folder halaman meja
    holdem:    { title: "Texas Hold'em", prefix: 'holdem-',    dir: 'holdem/',    players: '2–8 pemain' },
    blackjack: { title: 'Blackjack',     prefix: 'blackjack-', dir: 'blackjack/', players: '1–7 pemain vs dealer' }
  }
};

// Texas Hold'em
Poker.CONFIG = {
  SB: 10,              // small blind
  BB: 20,              // big blind
  START: 1000,         // chip awal tiap pemain
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 8,
  MIN_CHIPS: 40,       // chip awal minimum yang boleh diatur tuan rumah (2 x BB)
  NEXT_HAND_MS: 9000   // jeda sebelum tangan berikutnya
};

// Blackjack
Blackjack.CONFIG = {
  START: 1000,         // chip awal tiap pemain
  MIN_BET: 10,
  MIN_PLAYERS: 1,
  MAX_PLAYERS: 7,
  MIN_CHIPS: 100,      // chip awal minimum yang boleh diatur tuan rumah (10 x taruhan minimum)
  DECKS: 6,            // jumlah dek di sepatu (shoe)
  RESHUFFLE_BELOW: 0.25, // kocok ulang saat sisa kartu di bawah 25%
  MAX_HANDS: 4,        // maksimal hand per pemain setelah split
  BET_MS: 25000,       // batas waktu memasang taruhan
  TURN_MS: 30000,      // batas waktu tiap giliran (lewat = otomatis Stand)
  DEALER_STEP_MS: 800, // jeda antar kartu dealer
  RESULT_MS: 7000      // jeda hasil sebelum ronde berikutnya
};

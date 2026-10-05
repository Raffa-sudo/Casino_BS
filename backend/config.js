// Pengaturan game. Ubah angka di sini untuk menyesuaikan aturan meja.
window.Poker = window.Poker || {};
Poker.CONFIG = {
  SB: 10,              // small blind
  BB: 20,              // big blind
  START: 1000,         // chip awal tiap pemain
  MAX_PLAYERS: 6,
  NEXT_HAND_MS: 7000,  // jeda sebelum tangan berikutnya
  ID_PREFIX: 'holdem-' // awalan ID peer (kode meja ditambahkan di belakang)
};

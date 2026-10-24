// Latihan menguji konversi harga (jalankan: node latihan/test.js)
const KURS = 16000;
const hargaRupiah = (usd) => Math.round((usd * KURS) / 100) * 100;

console.assert(hargaRupiah(1) === 16000, "1 USD = Rp 16.000");
console.assert(hargaRupiah(9.99) === 159800, "dibulatkan ke ratusan");
console.assert(hargaRupiah(0) === 0, "harga nol");
console.log("Selesai. Tidak ada pesan Assertion failed berarti semua lulus.");
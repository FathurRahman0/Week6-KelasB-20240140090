// ===== Halaman Pemesanan: Fetch produk by id + Form DOM & Event Handling =====
const KURS = 16000; // kurs contoh: 1 USD = Rp 16.000
const ONGKIR = { reguler: 15000, express: 30000 };
const NAMA_KURIR = { reguler: "Reguler (2–4 hari)", express: "Express (1 hari)" };
const MAKS_BELI = 10;

// Id produk dibawa dari Etalase lewat URL: form.html?id=5
const idProduk = Number(new URLSearchParams(window.location.search).get("id"));

const elStatus = document.getElementById("status-produk");
const elUlang = document.getElementById("btn-ulang");
const elLink = document.getElementById("link-etalase");
const elArea = document.getElementById("area-pesan");
const elProduk = document.getElementById("produk-dipilih");
const elRingkasan = document.getElementById("ringkasan");
const elKonfirmasi = document.getElementById("konfirmasi");
const form = document.getElementById("form-pesan");
const inputJumlah = document.getElementById("jumlah");
const catatan = document.getElementById("catatan");
const hitung = document.getElementById("hitung-catatan");

let produk = null;

// ---------- Fungsi bantu ----------
function buat(tag, kelas, teks) {
  const node = document.createElement(tag);
  if (kelas) node.className = kelas;
  if (teks !== undefined) node.textContent = teks;
  return node;
}

function rupiah(angka) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(angka);
}

function hargaRupiah(p) {
  return Math.round((p.price * KURS) / 100) * 100;
}

function setStatus(pesan, { loading = false, error = false } = {}) {
  elStatus.textContent = "";
  elStatus.classList.toggle("error-text", error);
  if (loading) elStatus.appendChild(buat("span", "spinner"));
  elStatus.appendChild(document.createTextNode(pesan));
}

function maksJumlah() {
  return Math.min(produk.stock, MAKS_BELI);
}

function kurirDipilih() {
  return form.querySelector('input[name="kurir"]:checked').value;
}

function baris(label, nilai, kelas = "") {
  const r = buat("div", kelas ? `row ${kelas}` : "row");
  r.append(buat("span", "", label), buat("span", "", nilai));
  return r;
}

// ---------- Mengambil produk yang dipilih (Fetch API) ----------
async function muatProduk() {
  elUlang.hidden = true;
  elLink.hidden = true;
  elArea.hidden = true;

  if (!Number.isInteger(idProduk) || idProduk < 1) {
    setStatus("Belum ada produk yang dipilih. Pilih produk di Etalase terlebih dulu.");
    elLink.hidden = false;
    return;
  }

  setStatus("Memuat data produk…", { loading: true });

  try {
    const response = await fetch(`https://dummyjson.com/products/${idProduk}`);
    if (response.status === 404) throw new Error("produk tidak ditemukan");
    if (!response.ok) throw new Error(`server mengembalikan status ${response.status}`);
    produk = await response.json();
  } catch (err) {
    console.error("Gagal memuat produk:", err);
    setStatus(`Data produk gagal dimuat (${err.message}). Periksa koneksi internet lalu coba lagi.`, { error: true });
    elUlang.hidden = false;
    elLink.hidden = false;
    return;
  }

  if (produk.stock <= 0) {
    setStatus(`Maaf, stok ${produk.title} sedang habis.`, { error: true });
    elLink.hidden = false;
    return;
  }

  setStatus("");
  tampilProduk();
  inputJumlah.max = String(maksJumlah());
  elArea.hidden = false;
  renderRingkasan();
}

function tampilProduk() {
  const gambar = buat("img");
  gambar.src = produk.thumbnail;
  gambar.alt = produk.title;

  const teks = buat("div");
  teks.append(
    buat("div", "nama-produk", produk.title),
    buat("div", "kecil", `${produk.category.replace(/-/g, " ")} · stok ${produk.stock}`),
    buat("div", "kecil", rupiah(hargaRupiah(produk)))
  );

  const wadah = buat("div", "pilihan");
  wadah.append(gambar, teks);
  elProduk.replaceChildren(wadah);
}

// ---------- Ringkasan pesanan (berubah saat form diisi) ----------
function hitungTotal() {
  const jumlahValid = aturan.jumlah(inputJumlah.value) === "";
  const qty = jumlahValid ? Number(inputJumlah.value) : 0;
  const kurir = kurirDipilih();
  const subtotal = hargaRupiah(produk) * qty;
  const ongkir = qty > 0 ? ONGKIR[kurir] : 0;
  return { qty, kurir, subtotal, ongkir, total: subtotal + ongkir };
}

function renderRingkasan() {
  perbaruiStepper();
  const { qty, kurir, subtotal, ongkir, total } = hitungTotal();
  elRingkasan.replaceChildren(
    buat("h3", "", "Ringkasan pesanan"),
    baris("Harga satuan", rupiah(hargaRupiah(produk))),
    baris("Jumlah", qty ? `${qty} pcs` : "-"),
    baris("Subtotal", rupiah(subtotal)),
    baris(`Ongkir ${kurir}`, qty ? rupiah(ongkir) : "-"),
    baris("Total bayar", rupiah(total), "grand")
  );
}

// ---------- Aturan validasi (return "" bila valid) ----------
const aturan = {
  nama: (v) => {
    v = v.trim();
    if (!v) return "Nama wajib diisi.";
    if (v.length < 3) return "Nama minimal 3 karakter.";
    if (v.length > 50) return "Nama maksimal 50 karakter.";
    if (!/^[\p{L}\s.'-]+$/u.test(v)) return "Nama hanya boleh berisi huruf.";
    return "";
  },
  telepon: (v) => {
    const n = v.replace(/[\s-]/g, "");
    if (!n) return "Nomor HP wajib diisi.";
    if (!/^(\+62|62|0)8[1-9][0-9]{7,10}$/.test(n)) return "Nomor HP tidak valid, contoh: 081234567890.";
    return "";
  },
  alamat: (v) => {
    v = v.trim();
    if (!v) return "Alamat wajib diisi.";
    if (v.length < 10) return "Alamat terlalu singkat. Tulis jalan, nomor, kota, dan kode pos.";
    return "";
  },
  jumlah: (v) => {
    if (v === "") return "Jumlah wajib diisi.";
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1) return "Jumlah minimal 1 dan berupa bilangan bulat.";
    if (produk && n > maksJumlah()) return `Jumlah maksimal ${maksJumlah()} (sesuai stok dan batas pembelian).`;
    return "";
  },
};

function tampilkanError(id, pesan) {
  const input = document.getElementById(id);
  document.getElementById(`err-${id}`).textContent = pesan;
  input.classList.toggle("invalid", Boolean(pesan));
  input.classList.toggle("valid", !pesan && input.value.trim() !== "");
  input.setAttribute("aria-invalid", pesan ? "true" : "false");
}

function validasiField(id) {
  const pesan = aturan[id](document.getElementById(id).value);
  tampilkanError(id, pesan);
  return !pesan;
}

function validasiSetuju() {
  const cek = document.getElementById("setuju");
  const pesan = cek.checked ? "" : "Centang pernyataan ini sebelum membuat pesanan.";
  document.getElementById("err-setuju").textContent = pesan;
  cek.setAttribute("aria-invalid", pesan ? "true" : "false");
  return !pesan;
}

// ---------- Event listener ----------
// Validasi langsung saat mengetik (input) dan saat keluar dari field (blur)
Object.keys(aturan).forEach((id) => {
  const field = document.getElementById(id);
  field.addEventListener("input", () => validasiField(id));
  field.addEventListener("blur", () => validasiField(id));
});
document.getElementById("setuju").addEventListener("change", validasiSetuju);

// Ringkasan ikut berubah saat jumlah atau kurir diganti
inputJumlah.addEventListener("input", renderRingkasan);
// Tombol − dan + pada jumlah
const btnKurang = document.getElementById("kurang");
const btnTambah = document.getElementById("tambah");

function ubahJumlah(selisih) {
  const sekarang = Number(inputJumlah.value) || 0;
  const baru = Math.min(Math.max(sekarang + selisih, 1), maksJumlah());
  inputJumlah.value = String(baru);
  inputJumlah.dispatchEvent(new Event("input", { bubbles: true }));
}

function perbaruiStepper() {
  const n = Number(inputJumlah.value) || 0;
  btnKurang.disabled = n <= 1;
  btnTambah.disabled = n >= maksJumlah();
}

btnKurang.addEventListener("click", () => ubahJumlah(-1));
btnTambah.addEventListener("click", () => ubahJumlah(1));
form.querySelectorAll('input[name="kurir"]').forEach((radio) => radio.addEventListener("change", renderRingkasan));

// Penghitung karakter catatan
catatan.addEventListener("input", () => {
  const n = catatan.value.length;
  hitung.textContent = `${n} / ${catatan.maxLength} karakter`;
  hitung.classList.toggle("limit", n >= catatan.maxLength);
});

// Submit: validasi semua field, lalu tampilkan konfirmasi
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const hasil = Object.keys(aturan).map(validasiField);
  hasil.push(validasiSetuju());

  if (hasil.includes(false)) {
    const pertama = form.querySelector('[aria-invalid="true"]');
    if (pertama) pertama.focus();
    return;
  }

  tampilkanKonfirmasi();
});

// Reset: bersihkan pesan error dan hitung ulang ringkasan
form.addEventListener("reset", () => {
  setTimeout(() => {
    form.querySelectorAll(".invalid, .valid").forEach((n) => n.classList.remove("invalid", "valid"));
    form.querySelectorAll("[aria-invalid]").forEach((n) => n.removeAttribute("aria-invalid"));
    form.querySelectorAll(".error").forEach((n) => (n.textContent = ""));
    hitung.textContent = `0 / ${catatan.maxLength} karakter`;
    hitung.classList.remove("limit");
    renderRingkasan();
  }, 0);
});

elUlang.addEventListener("click", muatProduk);

// ---------- Konfirmasi pesanan ----------
function tampilkanKonfirmasi() {
  const data = new FormData(form);
  const { qty, kurir, total } = hitungTotal();
  const nomor = "PN-" + Date.now().toString(36).toUpperCase();

  const dl = buat("dl", "konf-dl");
  const tambah = (label, nilai) => dl.append(buat("dt", "", label), buat("dd", "", nilai));
  tambah("Penerima", `${data.get("nama").trim()} (${data.get("telepon").trim()})`);
  tambah("Alamat", data.get("alamat").trim());
  tambah("Produk", `${qty} × ${produk.title}`);
  tambah("Pengiriman", NAMA_KURIR[kurir]);
  tambah("Catatan", data.get("catatan").trim() || "-");
  tambah("Total bayar", rupiah(total));
  tambah("Waktu", new Date().toLocaleString("id-ID"));

  const lagi = buat("a", "btn", "Pesan produk lain");
  lagi.href = "index.html";

  elKonfirmasi.replaceChildren(
    buat("p", "sukses", `Pesanan ${nomor} diterima.`),
    buat("p", "", `Terima kasih, ${data.get("nama").trim()}. Pesanan Anda sedang kami proses.`),
    dl,
    lagi
  );

  elArea.hidden = true;
  elKonfirmasi.hidden = false;
  elKonfirmasi.scrollIntoView({ behavior: "smooth", block: "start" });
}

muatProduk();
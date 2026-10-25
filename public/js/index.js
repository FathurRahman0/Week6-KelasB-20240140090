// ===== Halaman Etalase: Fetch API =====
const API_URL = "https://dummyjson.com/products?limit=100";
const KURS = 16000;
const BATAS_STOK_MENIPIS = 10;

let semuaProduk = [];
let kategoriAktif = "semua";
let kataCari = "";

const elDaftar = document.getElementById("daftar-produk");
const elStatus = document.getElementById("status-produk");
const elUlang = document.getElementById("btn-ulang");
const elCari = document.getElementById("cari");
const elKategori = document.getElementById("kategori");

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

// Harga USD dikonversi ke rupiah dan dibulatkan ke ratusan
function hargaRupiah(produk) {
  return Math.round((produk.price * KURS) / 100) * 100;
}

function labelKategori(teks) {
  return teks.replace(/-/g, " ").replace(/^\w/, (huruf) => huruf.toUpperCase());
}

function setStatus(pesan, { loading = false, error = false } = {}) {
  elStatus.textContent = "";
  elStatus.classList.toggle("error-text", error);
  if (loading) elStatus.appendChild(buat("span", "spinner"));
  elStatus.appendChild(document.createTextNode(pesan));
}

// ---------- Menampilkan produk ke halaman (DOM) ----------
function buatKartu(produk) {
  const kartu = buat("li", "product");

  const thumb = buat("div", "thumb");
  const gambar = buat("img");
  gambar.src = produk.thumbnail;
  gambar.alt = produk.title;
  gambar.loading = "lazy";
  thumb.appendChild(gambar);

  if (produk.stock <= 0) {
    thumb.appendChild(buat("span", "badge badge-habis", "Stok Habis"));
  } else if (produk.stock < BATAS_STOK_MENIPIS) {
    thumb.appendChild(buat("span", "badge", "Stok Menipis"));
  }

  const info = buat("div", "info");
  info.append(
    buat("h3", "name", produk.title),
    buat("p", "cat", labelKategori(produk.category)),
    buat("p", "price", rupiah(hargaRupiah(produk))),
    buat("p", "stok", `Stok: ${produk.stock}`)
  );

  let aksi;
  if (produk.stock > 0) {
    aksi = buat("a", "btn", "Pesan");
    aksi.href = `form.html?id=${produk.id}`;
  } else {
    aksi = buat("button", "btn", "Stok habis");
    aksi.type = "button";
    aksi.disabled = true;
  }

  kartu.append(thumb, info, aksi);
  return kartu;
}

function produkTerfilter() {
  return semuaProduk.filter((p) => {
    const cocokKategori = kategoriAktif === "semua" || p.category === kategoriAktif;
    const cocokNama = p.title.toLowerCase().includes(kataCari);
    return cocokKategori && cocokNama;
  });
}

function render() {
  const daftar = produkTerfilter();
  elDaftar.replaceChildren(...daftar.map(buatKartu));
  setStatus(
    daftar.length
      ? `Menampilkan ${daftar.length} dari ${semuaProduk.length} produk.`
      : "Tidak ada produk yang cocok. Coba kata kunci atau kategori lain."
  );
}

function renderKategori() {
  const daftar = ["semua", ...new Set(semuaProduk.map((p) => p.category))];
  elKategori.replaceChildren(
    ...daftar.map((kategori) => {
      const chip = buat("button", "chip", kategori === "semua" ? "Semua" : labelKategori(kategori));
      chip.type = "button";
      chip.setAttribute("aria-pressed", String(kategori === kategoriAktif));
      chip.addEventListener("click", () => {
        kategoriAktif = kategori;
        renderKategori();
        render();
      });
      return chip;
    })
  );
}

// ---------- Mengambil data (Fetch API) ----------
async function muatProduk() {
  elUlang.hidden = true;
  elDaftar.replaceChildren();
  setStatus("Memuat katalog produk…", { loading: true });

  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`server mengembalikan status ${response.status}`);
    }
    const data = await response.json();
    if (!Array.isArray(data.products)) {
      throw new Error("format data tidak sesuai");
    }

    semuaProduk = data.products;
    renderKategori();
    render();
  } catch (err) {
    console.error("Gagal memuat produk:", err);
    setStatus(`Katalog gagal dimuat (${err.message}). Periksa koneksi internet lalu coba lagi.`, { error: true });
    elUlang.hidden = false;
  }
}

// ---------- Event listener ----------
elCari.addEventListener("input", () => {
  kataCari = elCari.value.trim().toLowerCase();
  render();
});
elUlang.addEventListener("click", muatProduk);

muatProduk();
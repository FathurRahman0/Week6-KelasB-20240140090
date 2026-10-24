// ===== Dipakai oleh index.html dan form.html: utilitas + keranjang =====

// ---------- Utilitas ----------
const KURS = 16000;                 // kurs contoh: 1 USD = Rp 16.000
const GRATIS_ONGKIR_MIN = 500000;   // gratis ongkir reguler
const ONGKIR = { reguler: 15000, express: 30000 };

const $ = (id) => document.getElementById(id);

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

// Harga dibulatkan ke ratusan rupiah supaya terlihat wajar
function hargaAsli(p) {
  return Math.round((p.price * KURS) / 100) * 100;
}
function hargaAkhir(p) {
  return Math.round((p.price * (1 - (p.discountPercentage || 0) / 100) * KURS) / 100) * 100;
}

function hitungOngkir(subtotal, kurir) {
  if (subtotal === 0) return 0;
  if (kurir === "reguler" && subtotal >= GRATIS_ONGKIR_MIN) return 0;
  return ONGKIR[kurir];
}

// Pembuat elemen DOM yang aman (memakai textContent, bukan innerHTML)
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, val] of Object.entries(props)) {
    if (key === "class") node.className = val;
    else if (key === "text") node.textContent = val;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2).toLowerCase(), val);
    else if (val === true) node.setAttribute(key, "");
    else if (val !== false && val != null) node.setAttribute(key, val);
  }
  node.append(...children.flat().filter((c) => c != null && c !== false));
  return node;
}

let timerToast;
function toast(pesan) {
  const t = $("toast");
  t.textContent = pesan;
  t.classList.add("show");
  clearTimeout(timerToast);
  timerToast = setTimeout(() => t.classList.remove("show"), 2200);
}

// ---------- Keranjang (tersimpan di localStorage, jadi terbawa antar halaman) ----------
const Cart = (() => {
  const KEY = "pasarnusa-keranjang";
  let items = [];
  try {
    items = JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    items = [];
  }
  const pendengar = [];

  function simpan() {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* penyimpanan tidak tersedia, abaikan */
    }
    pendengar.forEach((fn) => fn());
  }

  return {
    get items() { return items; },
    onChange(fn) { pendengar.push(fn); },
    add(p, qty = 1) {
      const maks = p.stock > 0 ? p.stock : 0;
      if (maks === 0) return;
      const ada = items.find((i) => i.id === p.id);
      if (ada) {
        ada.qty = Math.min(ada.qty + qty, maks);
      } else {
        items.push({ id: p.id, title: p.title, thumbnail: p.thumbnail, harga: hargaAkhir(p), stock: maks, qty: Math.min(qty, maks) });
      }
      simpan();
    },
    setQty(id, qty) {
      const i = items.find((x) => x.id === id);
      if (!i) return;
      i.qty = Math.max(1, Math.min(qty, i.stock));
      simpan();
    },
    remove(id) {
      items = items.filter((i) => i.id !== id);
      simpan();
    },
    clear() {
      items = [];
      simpan();
    },
    count() { return items.reduce((a, i) => a + i.qty, 0); },
    subtotal() { return items.reduce((a, i) => a + i.qty * i.harga, 0); },
  };
})();

// ---------- Tampilan drawer keranjang ----------
const elDrawer = $("keranjang");
const elOverlay = $("overlay");

function bukaKeranjang() {
  elDrawer.classList.add("open");
  elDrawer.setAttribute("aria-hidden", "false");
  elOverlay.hidden = false;
  $("btn-tutup-keranjang").focus();
}
function tutupKeranjang() {
  elDrawer.classList.remove("open");
  elDrawer.setAttribute("aria-hidden", "true");
  elOverlay.hidden = true;
}

function barisKeranjang(i) {
  return el("li", { class: "cart-item" },
    el("img", { src: i.thumbnail, alt: "" }),
    el("div", {},
      el("div", { class: "t", text: i.title }),
      el("div", { class: "u", text: rupiah(i.harga) }),
      el("div", { class: "qty" },
        el("button", { type: "button", "aria-label": `Kurangi ${i.title}`, disabled: i.qty <= 1, onclick: () => Cart.setQty(i.id, i.qty - 1) }, "−"),
        el("span", { text: String(i.qty) }),
        el("button", { type: "button", "aria-label": `Tambah ${i.title}`, disabled: i.qty >= i.stock, onclick: () => Cart.setQty(i.id, i.qty + 1) }, "+")
      ),
      el("button", { type: "button", class: "link-btn", onclick: () => Cart.remove(i.id), text: "Hapus" })
    ),
    el("div", { class: "total", text: rupiah(i.harga * i.qty) })
  );
}

function renderKeranjang() {
  const badge = $("jumlah-keranjang");
  const jumlah = Cart.count();
  badge.textContent = String(jumlah);
  badge.hidden = jumlah === 0;

  const wadah = $("daftar-keranjang");
  if (Cart.items.length === 0) {
    wadah.replaceChildren(el("li", { class: "empty muted", text: "Keranjang masih kosong. Pilih produk di etalase dulu." }));
  } else {
    wadah.replaceChildren(...Cart.items.map(barisKeranjang));
  }
  $("subtotal-keranjang").textContent = rupiah(Cart.subtotal());
  $("btn-ke-checkout").disabled = Cart.items.length === 0;
}

$("btn-keranjang").addEventListener("click", bukaKeranjang);
$("btn-tutup-keranjang").addEventListener("click", tutupKeranjang);
elOverlay.addEventListener("click", tutupKeranjang);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && elDrawer.classList.contains("open")) tutupKeranjang();
});

// Dari halaman Etalase pindah ke form.html; kalau sudah di form.html cukup tutup drawer
$("btn-ke-checkout").addEventListener("click", () => {
  if ($("form-checkout")) {
    tutupKeranjang();
    $("checkout").scrollIntoView({ behavior: "smooth" });
  } else {
    window.location.href = "form.html";
  }
});

Cart.onChange(renderKeranjang);
renderKeranjang();
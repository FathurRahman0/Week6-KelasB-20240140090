// Percobaan Fetch API (jalankan: node latihan/fetch.js, perlu Node 18 ke atas)
async function coba() {
  const res = await fetch("https://dummyjson.com/products?limit=3");
  if (!res.ok) throw new Error(`status ${res.status}`);
  const data = await res.json();
  data.products.forEach((p) => console.log(p.title, "-", p.price));
}

coba().catch((err) => console.error("Gagal:", err.message));
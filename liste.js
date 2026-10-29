// Page privée pour voir les commandes : /api/liste?token=VOTRE_ADMIN_TOKEN
import { getStore } from "@netlify/blobs";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export default async (req) => {
  const token = new URL(req.url).searchParams.get("token");
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return new Response("Accès refusé", { status: 403 });
  }
  const store = getStore("commandes");
  const { blobs } = await store.list();
  const rows = [];
  for (const b of blobs) {
    const c = await store.get(b.key, { type: "json" });
    if (c) rows.push(c);
  }
  rows.sort((a, b) => b.date.localeCompare(a.date));
  const html = `<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Commandes</title><style>body{font:15px sans-serif;padding:1rem}td,th{border:1px solid #ccc;padding:.4rem;text-align:left}table{border-collapse:collapse;display:block;overflow-x:auto}</style>
<h1>Commandes (${rows.length})</h1><table><tr><th>Date</th><th>RAVIP</th><th>Téléphone</th><th>Montant</th><th>Référence</th></tr>
${rows.map((c) => `<tr><td>${esc(c.date)}</td><td>${esc(c.ravip)}</td><td>${esc(c.tel)}</td><td>${esc(c.montant)}</td><td>${esc(c.transactionId)}</td></tr>`).join("")}</table>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
};

export const config = { path: "/api/liste" };

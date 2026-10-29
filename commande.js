// Reçoit la commande après un paiement KkiaPay, vérifie le paiement côté serveur, puis l'enregistre.
import * as mod from "@kkiapay-org/nodejs-sdk";
import { getStore } from "@netlify/blobs";

const kkiapay = mod.kkiapay ?? mod.default?.kkiapay;
const MONTANT = 1300;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

export default async (req) => {
  if (req.method !== "POST") return json({ erreur: "Méthode non autorisée" }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ erreur: "Requête invalide" }, 400); }

  const ravip = String(body.ravip ?? "").trim();
  const tel = String(body.tel ?? "").replace(/\s/g, "");
  const transactionId = String(body.transactionId ?? "").trim();

  if (ravip.length < 6 || ravip.length > 30) return json({ erreur: "Numéro RAVIP invalide" }, 400);
  if (!/^01\d{8}$/.test(tel)) return json({ erreur: "Numéro de téléphone invalide" }, 400);
  if (!/^[A-Za-z0-9_-]{3,64}$/.test(transactionId)) return json({ erreur: "Transaction invalide" }, 400);

  const store = getStore("commandes");

  // Une transaction ne peut servir qu'une seule fois
  if (await store.get(transactionId)) return json({ erreur: "Transaction déjà utilisée" }, 409);

  // Vérification auprès de KkiaPay avec vos clés privées (jamais visibles par les clients)
  const k = kkiapay({
    publickey: process.env.KKIAPAY_PUBLIC_KEY,
    privatekey: process.env.KKIAPAY_PRIVATE_KEY,
    secretkey: process.env.KKIAPAY_SECRET,
    sandbox: process.env.KKIAPAY_SANDBOX === "true"
  });

  let tx;
  try { tx = await k.verify(transactionId); }
  catch { return json({ erreur: "Vérification impossible, réessayez" }, 502); }

  if (tx?.status !== "SUCCESS" || Number(tx?.amount) < MONTANT) {
    return json({ erreur: "Paiement non valide" }, 402);
  }

  await store.setJSON(transactionId, {
    ravip, tel, transactionId, montant: Number(tx.amount), date: new Date().toISOString(), statut: "à traiter"
  });
  return json({ ok: true });(property) 
};

export const config = { path: "/api/commande" };

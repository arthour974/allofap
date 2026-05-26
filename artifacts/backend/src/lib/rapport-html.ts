import type { getInterventionFull } from "./get-intervention-full.js";

type InterventionFull = NonNullable<Awaited<ReturnType<typeof getInterventionFull>>>;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMasseExtraite(full: InterventionFull): string {
  if (full.masseExtraiteg != null) return `${Number(full.masseExtraiteg).toFixed(0)} g`;
  if (full.poidsEntreeG != null && full.poidsSortieG != null) {
    return `${(Number(full.poidsEntreeG) - Number(full.poidsSortieG)).toFixed(0)} g`;
  }
  return "-";
}

function formatEfficacitePression(full: InterventionFull): string {
  if (full.efficacitePrensionPourcent != null) {
    return `${Number(full.efficacitePrensionPourcent).toFixed(1)} %`;
  }
  if (
    full.pressionEntreeMbar != null &&
    full.pressionSortieMbar != null &&
    Number(full.pressionEntreeMbar) > 0
  ) {
    const pct =
      ((Number(full.pressionEntreeMbar) - Number(full.pressionSortieMbar)) /
        Number(full.pressionEntreeMbar)) *
      100;
    return `${pct.toFixed(1)} %`;
  }
  return "-";
}

function buildMediasSection(full: InterventionFull): string {
  const medias = full.medias ?? [];
  if (medias.length === 0) return "";

  const photos = medias.filter((m) => m.mimeType?.startsWith("image/"));
  const videos = medias.filter((m) => m.mimeType?.startsWith("video/"));

  let html = "<h2>Photos & FAP</h2>";

  if (photos.length > 0) {
    html += `<div class="photos">${photos
      .map((m) => {
        const url = escapeHtml(m.url);
        return `<figure><img src="${url}" alt="Photo"/></figure>`;
      })
      .join("")}</div>`;
  }

  if (videos.length > 0) {
    html += `<ul class="videos">${videos
      .map((m) => `<li><a href="${escapeHtml(m.url)}">${escapeHtml(m.url)}</a></li>`)
      .join("")}</ul>`;
  }

  return html;
}

export function buildRapportHtml(full: InterventionFull): string {
  const STATUT_LABELS: Record<string, string> = {
    CREATION: "Création",
    CLIENT_VEHICULE: "Client & Véhicule",
    CONTROLE_INITIAL: "Contrôle Initial",
    VALIDATION_RECEPTION: "Validation Réception",
    ATELIER_ENTREE: "Entrée Atelier",
    NETTOYAGE: "Nettoyage",
    SECHAGE: "Séchage",
    CONTROLE_FINAL: "Contrôle Final",
    RESTITUTION: "Restitution",
    CLOTURE: "Clôturé",
  };
  const RESULTAT_LABELS: Record<string, string> = {
    NETTOYE: "Nettoyé avec succès",
    PARTIELLEMENT_NETTOYE: "Partiellement nettoyé",
    NON_NETTOYABLE: "Non nettoyable",
  };
  const DIAG_LABELS: Record<string, string> = {
    OK: "OK",
    SONDE_CASSEE: "Sonde cassée",
    TUBES_HS: "Tubes HS",
    GRIPPE: "Grippé",
    AUTRE: "Autre",
    SAIN: "Sain",
    FISSURE: "Fissuré",
    FONDU: "Fondu",
    HUILE: "Plein d'huile",
    COLMATE: "Colmaté",
  };

  const d = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const masseExtraite = formatMasseExtraite(full);
  const efficacitePression = formatEfficacitePression(full);
  const dateCloture = full.dateCloture
    ? new Date(full.dateCloture).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  const preconisations: string[] = [];
  if (full.preconisationCapteurPression) preconisations.push("Capteur de pression différentielle");
  if (full.preconisationEgr) preconisations.push("Vanne EGR");
  if (full.preconisationRegenerationAutoroute) preconisations.push("Régénération sur autoroute");
  if (full.preconisationControlInjecteurs) preconisations.push("Contrôle injecteurs");
  if (full.preconisationControlTurbo) preconisations.push("Contrôle turbo");
  if (full.preconisationControlConsommationHuile) preconisations.push("Contrôle consommation d'huile");

  const resultatBadgeClass =
    full.resultatFinal === "NETTOYE"
      ? "badge-green"
      : full.resultatFinal === "PARTIELLEMENT_NETTOYE"
        ? "badge-orange"
        : "badge-red";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Rapport FAP — ${escapeHtml(full.numeroDossier)}</title>
<style>
  body { font-family: Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 3px solid #27AE60; padding-bottom: 20px; }
  .logo { font-size: 28px; font-weight: 900; color: #121212; }
  .logo span { color: #27AE60; }
  .ref { text-align: right; font-size: 13px; color: #64748b; }
  .ref strong { font-size: 18px; color: #1e293b; display: block; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #121212; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 28px; }
  h3.sub { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 20px 0 8px; font-weight: 700; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-top: 12px; }
  .field label { font-size: 11px; color: #64748b; text-transform: uppercase; }
  .field p { margin: 2px 0 0; font-size: 14px; font-weight: 600; }
  .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 8px; }
  .metric { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
  .metric .val { font-size: 22px; font-weight: 800; color: #27AE60; }
  .metric .lbl { font-size: 11px; color: #64748b; margin-top: 4px; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 13px; font-weight: 700; }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-orange { background: #fed7aa; color: #9a3412; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .preco li { font-size: 13px; margin: 4px 0; }
  .photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px; }
  .photos figure { margin: 0; }
  .photos img { width: 100%; height: auto; max-height: 180px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0; display: block; }
  .videos { font-size: 12px; color: #475569; margin-top: 12px; padding-left: 18px; }
  .videos a { color: #27AE60; word-break: break-all; }
  .note { margin-top: 12px; padding: 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 13px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  @media print { body { padding: 20px; } .photos { break-inside: avoid; } }
</style>
</head>
<body>
<div class="header">
  <div class="logo">Allo<span>FAP</span><div style="font-size:12px;font-weight:400;color:#64748b;margin-top:4px;">Rapport de nettoyage de filtre à particules</div></div>
  <div class="ref"><strong>${escapeHtml(full.numeroDossier)}</strong>Édité le ${d}${dateCloture ? `<br/>Clôturé le ${dateCloture}` : ""}</div>
</div>

<h2>Informations Client & Véhicule</h2>
<div class="grid">
  <div class="field"><label>Client</label><p>${escapeHtml(full.client?.nomClient || "-")}</p></div>
  <div class="field"><label>Téléphone</label><p>${escapeHtml(full.client?.telephone || "-")}</p></div>
  <div class="field"><label>Immatriculation</label><p>${escapeHtml(full.vehicule?.immatriculation || "-")}</p></div>
  <div class="field"><label>Marque & Modèle</label><p>${escapeHtml(`${full.vehicule?.marque || "-"} ${full.vehicule?.modele || ""}`.trim())}</p></div>
  <div class="field"><label>VIN</label><p>${escapeHtml(full.vehicule?.vin || "-")}</p></div>
  <div class="field"><label>Motorisation</label><p>${escapeHtml(full.vehicule?.motorisation || "-")}</p></div>
  <div class="field"><label>Kilométrage</label><p>${full.vehicule?.kilometrage ? `${full.vehicule.kilometrage} km` : "-"}</p></div>
  <div class="field"><label>Statut</label><p><span class="badge badge-${full.statut === "CLOTURE" ? "green" : "orange"}">${STATUT_LABELS[full.statut] || full.statut}</span></p></div>
</div>

<h2>Contrôle initial</h2>
<div class="grid">
  <div class="field"><label>Poids à l'entrée</label><p>${full.poidsEntreeG != null ? `${full.poidsEntreeG} g` : "-"}</p></div>
  <div class="field"><label>Pression à l'entrée</label><p>${full.pressionEntreeMbar != null ? `${full.pressionEntreeMbar} mbar` : "-"}</p></div>
  <div class="field"><label>Diagnostic accessoires</label><p>${DIAG_LABELS[full.diagnosticAccessoires || ""] || full.diagnosticAccessoires || "-"}</p></div>
  <div class="field"><label>Diagnostic céramique</label><p>${DIAG_LABELS[full.diagnosticCeramique || ""] || full.diagnosticCeramique || "-"}</p></div>
</div>

<h2>Résultats de nettoyage</h2>
<h3 class="sub">Poids</h3>
<div class="metrics">
  <div class="metric"><div class="val">${full.poidsEntreeG != null ? `${full.poidsEntreeG} g` : "-"}</div><div class="lbl">Poids entrée</div></div>
  <div class="metric"><div class="val">${full.poidsSortieG != null ? `${full.poidsSortieG} g` : "-"}</div><div class="lbl">Poids sortie</div></div>
  <div class="metric"><div class="val">${masseExtraite}</div><div class="lbl">Masse extraite</div></div>
</div>
<h3 class="sub">Pression</h3>
<div class="metrics">
  <div class="metric"><div class="val">${full.pressionEntreeMbar != null ? full.pressionEntreeMbar : "-"}</div><div class="lbl">Pression entrée (mbar)</div></div>
  <div class="metric"><div class="val">${full.pressionSortieMbar != null ? full.pressionSortieMbar : "-"}</div><div class="lbl">Pression sortie (mbar)</div></div>
  <div class="metric"><div class="val">${efficacitePression}</div><div class="lbl">Efficacité pression</div></div>
</div>
<div class="grid" style="margin-top:16px;">
  <div class="field"><label>Résultat final</label><p><span class="badge ${resultatBadgeClass}">${RESULTAT_LABELS[full.resultatFinal || ""] || full.resultatFinal || "Non renseigné"}</span></p></div>
</div>
${full.observationAtelier ? `<div class="note"><strong>Observations atelier :</strong> ${escapeHtml(full.observationAtelier)}</div>` : ""}

${buildMediasSection(full)}

${preconisations.length > 0 ? `<h2>Préconisations</h2><ul class="preco">${preconisations.map((p) => `<li>✓ ${escapeHtml(p)}</li>`).join("")}</ul>` : ""}

<div class="footer">AlloFAP — Rapport généré le ${d} — ${escapeHtml(full.numeroDossier)}<br/>Ce document est un rapport technique de nettoyage de filtre à particules.</div>
<script>window.onload = () => window.print();</script>
</body></html>`;
}

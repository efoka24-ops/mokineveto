import { Platform } from 'react-native';

/**
 * Reçu de paiement et billet de rendez-vous, exportables en PDF.
 *
 * L'hébergement n'offre aucune génération PDF côté serveur : le document est
 * un HTML autonome, converti en PDF sur l'appareil — par le navigateur
 * (« Enregistrer en PDF » de la boîte d'impression) sur le web/PWA, par
 * expo-print sur Android/iOS. Rien n'est inventé : chaque champ vient de la
 * transaction réelle ; un champ absent est simplement omis.
 */

export interface AppointmentDocData {
  vetName?: string;
  vetSpecialty?: string;
  date?: string;
  time?: string;
  consultationType?: 'CALL' | 'VIDEO' | 'FIELD';
  reason?: string;
  appointmentId?: string;
  reference?: string;
  amount?: number;
  method?: 'ORANGE_MONEY' | 'MTN_MOMO' | 'CARD';
  phone?: string;
  clientName?: string;
}

const TYPE_LABEL = { CALL: 'Consultation par appel', VIDEO: 'Consultation vidéo', FIELD: 'Consultation sur le terrain' } as const;
const METHOD_LABEL = { ORANGE_MONEY: 'Orange Money', MTN_MOMO: 'MTN MoMo', CARD: 'Carte bancaire' } as const;

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** 237699000111 → 237 •••• 111 : le document circule, on n'y expose pas le numéro entier. */
const maskPhone = (p?: string): string => {
  const d = (p ?? '').replace(/\D/g, '');
  return d.length >= 6 ? `${d.slice(0, 3)} •••• ${d.slice(-3)}` : '';
};

const money = (n?: number): string => (n === undefined ? '' : `${n.toLocaleString('fr-FR')} FCFA`);

const row = (label: string, value?: string): string =>
  value ? `<tr><td class="l">${esc(label)}</td><td class="v">${esc(value)}</td></tr>` : '';

const page = (title: string, badge: string, rows: string, foot: string): string => `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;color:#1c1c1e;margin:0;padding:32px;max-width:640px;margin-inline:auto}
  header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #3DB54A;padding-bottom:14px;margin-bottom:22px}
  .brand{font-size:24px;font-weight:700;color:#4A2317}.brand span{color:#3DB54A}
  .sub{font-size:11px;color:#8A8A8E;letter-spacing:.12em;text-transform:uppercase}
  h1{font-size:20px;margin:0 0 4px;color:#4A2317}
  .badge{display:inline-block;background:#D7F0DD;color:#2E9E3D;border-radius:999px;padding:4px 12px;font-size:12px;font-weight:700;margin-bottom:18px}
  table{width:100%;border-collapse:collapse}
  td{padding:9px 0;border-bottom:1px solid #E3E3E8;font-size:14px}
  td.l{color:#8A8A8E;width:42%}td.v{font-weight:600;text-align:right}
  .total td{font-size:17px;border-bottom:none;border-top:2px solid #4A2317;padding-top:14px}
  .total td.v{color:#3DB54A}
  .ref{margin-top:22px;padding:14px;border:2px dashed #3DB54A;border-radius:10px;text-align:center}
  .ref b{display:block;font-size:20px;letter-spacing:.14em;margin-top:4px}
  footer{margin-top:26px;font-size:11px;color:#8A8A8E;line-height:1.5}
  @media print{body{padding:0}@page{margin:16mm}}
</style></head><body>
<header><div><div class="brand">Mokine<span>Veto</span></div><div class="sub">Télémédecine vétérinaire</div></div>
<div class="sub">Émis le ${esc(new Date().toLocaleDateString('fr-FR'))}</div></header>
<h1>${esc(title)}</h1><div class="badge">${esc(badge)}</div>
${rows}
${foot}
</body></html>`;

export function buildReceiptHtml(d: AppointmentDocData): string {
  const rows = `<table>
    ${row('Bénéficiaire', d.vetName)}
    ${row('Prestation', d.consultationType ? TYPE_LABEL[d.consultationType] : 'Consultation vétérinaire')}
    ${row('Date du rendez-vous', d.date && d.time ? `${d.date} à ${d.time}` : d.date)}
    ${row('Moyen de paiement', d.method ? METHOD_LABEL[d.method] : undefined)}
    ${row('Numéro débité', maskPhone(d.phone))}
    <tr class="total"><td class="l">Total payé</td><td class="v">${esc(money(d.amount))}</td></tr>
  </table>`;
  const foot = d.reference
    ? `<div class="ref">Référence de transaction<b>${esc(d.reference)}</b></div>` : '';
  return page('Reçu de paiement', 'PAIEMENT CONFIRMÉ', rows, `${foot}
    <footer>Ce reçu atteste du paiement d'une consultation vétérinaire via MokineVeto. Conservez-le comme justificatif.</footer>`);
}

export function buildTicketHtml(d: AppointmentDocData): string {
  const rows = `<table>
    ${row('Vétérinaire', d.vetName)}
    ${row('Spécialité', d.vetSpecialty)}
    ${row('Date', d.date)}
    ${row('Heure', d.time)}
    ${row('Type de consultation', d.consultationType ? TYPE_LABEL[d.consultationType] : undefined)}
    ${row('Motif', d.reason)}
  </table>`;
  const code = d.reference ?? d.appointmentId;
  const foot = code ? `<div class="ref">Référence du rendez-vous<b>${esc(code)}</b></div>` : '';
  return page('Billet de rendez-vous', 'RENDEZ-VOUS CONFIRMÉ', rows, `${foot}
    <footer>Présentez ce billet (ou sa référence) au vétérinaire. En cas d'empêchement, annulez depuis l'application avant l'heure prévue.</footer>`);
}

/**
 * Ouvre le document en PDF : impression navigateur sur le web, fichier PDF
 * partagé/enregistré via la feuille de partage native sur Android/iOS.
 */
export async function exportPdf(html: string, filename: string): Promise<void> {
  if (Platform.OS === 'web') {
    const w = (globalThis as any).open?.('', '_blank');
    if (!w) throw new Error("Le navigateur a bloqué l'ouverture du document. Autorisez les fenêtres pop-up pour ce site.");
    w.document.write(html);
    w.document.title = filename;
    w.document.close();
    w.focus();
    // Laisse le temps au rendu avant d'ouvrir la boîte « Enregistrer en PDF ».
    setTimeout(() => w.print(), 400);
    return;
  }
  const Print = await import('expo-print');
  const Sharing = await import('expo-sharing');
  const { uri } = await Print.printToFileAsync({ html });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Le partage de fichiers n'est pas disponible sur cet appareil.");
  }
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: filename, UTI: 'com.adobe.pdf' });
}

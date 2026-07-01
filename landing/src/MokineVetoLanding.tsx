import React, { useState } from "react";

/**
 * MokineVeto — Landing page (direction B)
 * Template fourni par le client, converti en TypeScript.
 * Logo : déposez `mark.svg`/`mark.png` dans /public (constante MARK ci-dessous).
 */

const LOGO = `${import.meta.env.BASE_URL}logo.jpg`; // Official MokineVET branding
// APK : par défaut, l'asset "latest release" GitHub — URL permanente qui pointe
// automatiquement vers le dernier APK publié par le workflow CI (aucun réglage à
// refaire à chaque version). Surchargeable via VITE_APK_URL si besoin.
const APK_URL =
  import.meta.env.VITE_APK_URL ||
  "https://github.com/efoka24-ops/mokineveto/releases/latest/download/mokineveto.apk";

/* ------------------------------------------------------------------ */
/* i18n                                                                */
/* ------------------------------------------------------------------ */
type Dict = Record<string, string>;

const FR: Dict = {
  "nav.features": "Fonctionnalités",
  "nav.who": "Pour qui",
  "nav.kb": "Base de connaissances",
  "nav.pricing": "Tarifs",
  "nav.faq": "FAQ",
  "cta.download": "Télécharger l'app",
  "cta.farmer": "Je suis éleveur",
  "cta.vet": "Je suis vétérinaire",
  "hero.eyebrow": "Télémédecine vétérinaire · Cameroun",
  "hero.h1": "La santé de votre cheptel, à portée de téléphone.",
  "hero.sub":
    "MokineVeto relie éleveurs et vétérinaires ruraux grâce à un assistant IA de pré-analyse et plus de 100 fiches pathologiques — même sans connexion.",
  "hero.trust1": "Pensée pour le monde rural",
  "feat.h2": "Tout le suivi sanitaire, dans une seule application",
  "how.eyebrow": "Comment ça marche",
  "how.h2": "De l'observation au traitement",
  "who.h2": "Une plateforme, trois usages",
  "kb.h2": "100+ fiches pathologiques, validées et structurées",
  "price.h2": "Un modèle freemium, accessible à tous",
  "mm.h3": "Payez comme vous avez l'habitude",
  "faq.h2": "Questions fréquentes",
  "cta.h2": "Prêt à protéger votre cheptel ?",
};

const TRANSLATIONS: Record<string, Dict> = {
  en: {
    "nav.features": "Features",
    "nav.who": "Who it's for",
    "nav.kb": "Knowledge base",
    "nav.pricing": "Pricing",
    "nav.faq": "FAQ",
    "cta.download": "Download the app",
    "cta.farmer": "I'm a farmer",
    "cta.vet": "I'm a veterinarian",
    "hero.eyebrow": "Veterinary telemedicine · Cameroon",
    "hero.h1": "Your herd's health, just a phone away.",
    "hero.sub":
      "MokineVeto connects livestock farmers with rural veterinarians through an AI pre-analysis assistant and over 100 disease fact-sheets — even offline.",
    "hero.trust1": "Built for rural communities",
    "feat.h2": "All your animal health tracking, in one app",
    "how.eyebrow": "How it works",
    "how.h2": "From observation to treatment",
    "who.h2": "One platform, three uses",
    "kb.h2": "100+ disease fact-sheets, validated and structured",
    "price.h2": "A freemium model, accessible to everyone",
    "mm.h3": "Pay the way you already do",
    "faq.h2": "Frequently asked questions",
    "cta.h2": "Ready to protect your herd?",
  },
  ful: {
    "nav.features": "Golleeji",
    "nav.who": "Wonande hombo",
    "nav.kb": "Defte ganndal",
    "nav.pricing": "Coggu",
    "nav.faq": "Naamne",
    "cta.download": "Aawtu app ndee",
    "cta.farmer": "Ko mi gaynaako",
    "cta.vet": "Ko mi cafroowo dabbaaji",
    "hero.eyebrow": "Safrugol dabbaaji woɗɗungol · Kameruun",
    "hero.h1": "Cellal dabbaaji maa, e junngo maa.",
    "hero.sub":
      "MokineVeto na hawra gaynaaɓe e safroɓe dabbaaji ka ladde, e ballal IA e defte ñawu buri 100 — hay si enternet alaa.",
    "hero.trust1": "Sosaande ngam nokkuuji ladde",
    "feat.h2": "Ndimu cellal dabbaaji fof, e nder app gootal",
    "how.eyebrow": "No ɗum gollortoo",
    "how.h2": "Gila yiyde haa safaara",
    "who.h2": "Plaatiforom gootal, peeje tati",
    "kb.h2": "Defte ñawu buri 100, teskaaɗe e taƴtinaaɗe",
    "price.h2": "Ñaawoore freemium, ŋabbi wonande fof",
    "mm.h3": "Yoɓ no woowruɗaa",
    "faq.h2": "Naamne keewɗe",
    "cta.h2": "A hebii reende dabbaaji maa?",
  },
};

/* ------------------------------------------------------------------ */
/* Palette + composants utilitaires                                    */
/* ------------------------------------------------------------------ */
const C = {
  brown: "#2E1409",
  brownMid: "#3A1C10",
  green: "#3BB64C",
  greenDk: "#2E9A3E",
  greenLt: "#5FCB6B",
  ink: "#241812",
  body: "#6B5B4F",
  cream: "#FAF7F2",
};

function Icon({ d, paths }: { d?: string; paths?: string[] }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths ? paths.map((p, i) => <path key={i} d={p} />) : d ? <path d={d} /> : null}
    </svg>
  );
}

function Feature({ paths, title, children }: { paths: string[]; title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.cream, borderLeft: `3px solid ${C.green}`, borderRadius: "0 12px 12px 0", padding: 26 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Icon paths={paths} />
      </div>
      <h3 style={{ font: "700 19px 'Space Grotesk',sans-serif", color: C.ink, margin: "0 0 8px" }}>{title}</h3>
      <p style={{ fontSize: 15, lineHeight: 1.55, color: C.body, margin: 0 }}>{children}</p>
    </div>
  );
}

function Step({ n, last, title, children }: { n: string; last?: boolean; title: string; children: React.ReactNode }) {
  return (
    <div style={{ position: "relative", paddingRight: last ? 0 : 18 }}>
      <div style={{ width: 46, height: 46, borderRadius: "50%", background: last ? "#532517" : C.green, color: "#fff", font: "700 18px 'Space Grotesk',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>{n}</div>
      <h3 style={{ font: "700 17px 'Space Grotesk',sans-serif", color: C.ink, margin: "0 0 7px" }}>{title}</h3>
      <p style={{ fontSize: 14, lineHeight: 1.55, color: C.body, margin: 0 }}>{children}</p>
    </div>
  );
}

function Faq({ q, a, open }: { q: string; a: string; open?: boolean }) {
  return (
    <details open={open} style={{ background: C.cream, borderRadius: 12, padding: "18px 22px" }}>
      <summary style={{ font: "600 17px 'Space Grotesk',sans-serif", color: C.ink, display: "flex", justifyContent: "space-between", alignItems: "center", listStyle: "none", cursor: "pointer" }}>
        {q}
        <span style={{ color: C.green, fontSize: 22 }}>+</span>
      </summary>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: C.body, margin: "13px 0 0" }}>{a}</p>
    </details>
  );
}

/* ------------------------------------------------------------------ */
/* Composant principal                                                 */
/* ------------------------------------------------------------------ */
export default function MokineVetoLanding() {
  const [lang, setLang] = useState<"fr" | "en" | "ful">("fr");
  const t = (key: string) => (lang === "fr" ? FR[key] : TRANSLATIONS[lang]?.[key] ?? FR[key]);

  const langBtn = (code: "fr" | "en" | "ful", label: string) => (
    <button
      onClick={() => setLang(code)}
      style={{
        border: "none",
        background: lang === code ? C.green : "transparent",
        color: lang === code ? "#fff" : "#9DB89C",
        font: "600 12px 'Hanken Grotesk',sans-serif",
        padding: "6px 11px",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  const navLink = (href: string, key: string) => (
    <a href={href} style={{ textDecoration: "none", color: "#E7D8C8", fontWeight: 500, fontSize: 15 }}>{t(key)}</a>
  );

  return (
    <div style={{ fontFamily: "'Hanken Grotesk',sans-serif", color: C.ink, width: "100%", background: "#fff" }}>
      <style>{`
        @keyframes mkv-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        .mkv details>summary::-webkit-details-marker { display:none; }
        .mkv button { transition: transform .12s ease, filter .15s ease; }
        .mkv button:hover { filter: brightness(1.05); }
        .mkv button:active { transform: translateY(1px); }
        @media (max-width: 860px) {
          .mkv [data-grid] { grid-template-columns: 1fr !important; }
          .mkv [data-nav-links] { display: none !important; }
        }
      `}</style>

      <div className="mkv">
        {/* ===================== DARK HERO BLOCK ===================== */}
        <div style={{ background: C.brown, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -120, right: -80, width: 420, height: 420, background: "radial-gradient(circle, rgba(59,182,76,.22), transparent 65%)" }} />

          {/* NAV */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 56px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <span style={{ background: "#fff", borderRadius: 11, padding: "6px 8px", display: "inline-flex" }}>
                <img src={LOGO} alt="MokineVeto" style={{ height: 30, width: "auto", display: "block" }} />
              </span>
              <div style={{ lineHeight: 1 }}>
                <div style={{ font: "700 21px 'Space Grotesk',sans-serif", letterSpacing: "-.01em" }}>
                  <span style={{ color: "#fff" }}>Mokine</span><span style={{ color: C.greenLt }}>Veto</span>
                </div>
                <div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "#A98E78", marginTop: 3 }}>Remote Healthcare</div>
              </div>
            </div>
            <div data-nav-links style={{ display: "flex", alignItems: "center", gap: 30 }}>
              {navLink("#features", "nav.features")}
              {navLink("#who", "nav.who")}
              {navLink("#kb", "nav.kb")}
              {navLink("#pricing", "nav.pricing")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", border: "1px solid rgba(255,255,255,.22)", borderRadius: 999, overflow: "hidden" }}>
                {langBtn("fr", "FR")}{langBtn("en", "EN")}{langBtn("ful", "FUL")}
              </div>
              <a href={APK_URL} style={{ textDecoration: "none", background: C.green, color: "#fff", font: "700 14px 'Hanken Grotesk',sans-serif", padding: "11px 20px", borderRadius: 8 }}>{t("cta.download")}</a>
            </div>
          </div>

          {/* HERO */}
          <div data-grid style={{ position: "relative", display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 48, padding: "56px 56px 70px", alignItems: "center" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid rgba(95,203,107,.4)", color: "#7BD389", fontWeight: 600, fontSize: 13, letterSpacing: ".04em", padding: "7px 14px", borderRadius: 999, marginBottom: 26 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, display: "inline-block" }} />
                <span>{t("hero.eyebrow")}</span>
              </div>
              <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 56, lineHeight: 1.02, letterSpacing: "-.025em", color: "#fff", margin: "0 0 22px" }}>{t("hero.h1")}</h1>
              <p style={{ fontSize: 19, lineHeight: 1.55, color: "#D8C5B2", margin: "0 0 34px", maxWidth: 480 }}>{t("hero.sub")}</p>
              <div style={{ display: "flex", gap: 14, marginBottom: 30, flexWrap: "wrap" }}>
                <a href={APK_URL} style={{ textDecoration: "none", background: C.green, color: "#fff", font: "700 16px 'Hanken Grotesk',sans-serif", padding: "15px 28px", borderRadius: 8 }}>{t("cta.farmer")}</a>
                <a href={APK_URL} style={{ textDecoration: "none", background: "rgba(255,255,255,.06)", border: "1.5px solid rgba(255,255,255,.28)", color: "#fff", font: "700 16px 'Hanken Grotesk',sans-serif", padding: "15px 28px", borderRadius: 8 }}>{t("cta.vet")}</a>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 18, color: "#A98E78", fontSize: 14, fontWeight: 500 }}>
                <span>{t("hero.trust1")}</span>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#6B4A2E" }} />
                <span>Français · English · Fulfulde</span>
              </div>
            </div>

            {/* PHONE MOCKUP */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ position: "relative", width: 262, background: "#120A05", borderRadius: 34, padding: 10, boxShadow: "0 30px 60px -20px rgba(0,0,0,.6)", animation: "mkv-float 6s ease-in-out infinite" }}>
                <div style={{ background: "#F5F1E9", borderRadius: 26, overflow: "hidden" }}>
                  <div style={{ background: C.green, padding: "14px 16px 13px", color: "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <img src={LOGO} alt="" style={{ height: 20, filter: "brightness(0) invert(1)", opacity: .95 }} />
                      <div style={{ fontWeight: 700, fontSize: 13 }}>Assistant MokineVeto</div>
                      <div style={{ marginLeft: "auto", fontSize: 10, background: "rgba(255,255,255,.22)", padding: "3px 7px", borderRadius: 999 }}>IA</div>
                    </div>
                  </div>
                  <div style={{ padding: "14px 13px 16px", display: "flex", flexDirection: "column", gap: 9 }}>
                    <div style={{ alignSelf: "flex-start", maxWidth: "82%", background: "#fff", border: "1px solid #ECE3D6", padding: "9px 11px", borderRadius: "13px 13px 13px 4px", fontSize: 12, lineHeight: 1.4, color: "#3A2A20" }}>Quels signes observez-vous chez l'animal ?</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, background: "#EAF6E9", color: "#2E7D32", border: "1px solid #BFE3C0", padding: "5px 9px", borderRadius: 999 }}>Fièvre</span>
                      <span style={{ fontSize: 11, background: "#fff", color: C.body, border: "1px solid #E2D6C6", padding: "5px 9px", borderRadius: 999 }}>Boiterie</span>
                      <span style={{ fontSize: 11, background: "#fff", color: C.body, border: "1px solid #E2D6C6", padding: "5px 9px", borderRadius: 999 }}>Perte d'appétit</span>
                    </div>
                    <div style={{ alignSelf: "flex-end", maxWidth: "82%", background: "#532517", color: "#fff", padding: "9px 11px", borderRadius: "13px 13px 4px 13px", fontSize: 12, lineHeight: 1.4 }}>Fièvre et perte d'appétit depuis 2 jours.</div>
                    <div style={{ background: "#fff", border: "1px solid #ECE3D6", borderRadius: 13, padding: 12, marginTop: 2 }}>
                      <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "#9A8979", fontWeight: 700, marginBottom: 6 }}>Pré-analyse</div>
                      <div style={{ fontSize: 12, color: "#3A2A20", lineHeight: 1.45, marginBottom: 9 }}>Pathologies probables : <b>fièvre aphteuse</b>, theilériose.</div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#FCEAE6", color: "#C0392B", fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 999 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C0392B" }} />Urgence élevée — téléconsultation
                      </div>
                    </div>
                    <button style={{ marginTop: 3, border: "none", background: C.green, color: "#fff", font: "700 12px 'Hanken Grotesk',sans-serif", padding: 10, borderRadius: 9, cursor: "pointer" }}>Consulter un vétérinaire</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STATS STRIP */}
          <div data-grid style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid rgba(255,255,255,.1)", background: "rgba(0,0,0,.18)" }}>
            {[["100+", "fiches pathologiques"], ["3", "FR · EN · Fulfulde"], ["100 FCFA", "par fiche consultée"], ["Hors-ligne", "synchro automatique"]].map(([big, small], i) => (
              <div key={i} style={{ padding: "24px 28px", borderRight: i < 3 ? "1px solid rgba(255,255,255,.08)" : "none" }}>
                <div style={{ font: "700 30px 'Space Grotesk',sans-serif", color: C.greenLt }}>{big}</div>
                <div style={{ fontSize: 13, color: "#C9B6A2", marginTop: 3 }}>{small}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ===================== FEATURES ===================== */}
        <div id="features" style={{ padding: "80px 56px 72px" }}>
          <div style={{ marginBottom: 46 }}>
            <div style={{ font: "700 13px 'Space Grotesk',sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: C.greenDk, marginBottom: 12 }}>{t("nav.features")}</div>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 42, color: C.ink, margin: 0, letterSpacing: "-.02em", maxWidth: 680 }}>{t("feat.h2")}</h2>
          </div>
          <div data-grid style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
            <Feature paths={["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"]} title="Téléconsultation">Messagerie, appel audio et vidéo. Le tri d'urgence détermine si une visite sur place est nécessaire.</Feature>
            <Feature paths={["M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z", "M19 10v2a7 7 0 0 1-14 0v-2"]} title="Assistant IA de pré-analyse">Questionnaire guidé, pré-diagnostic d'orientation et niveau d'urgence. Le diagnostic final revient au vétérinaire.</Feature>
            <Feature paths={["M4 19.5A2.5 2.5 0 0 1 6.5 17H20", "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"]} title="Registre numérique du cheptel">Carnet de santé, vaccinations, reproduction, croissance et gestion des entrées / sorties.</Feature>
            <Feature paths={["M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9", "M10.3 21a1.94 1.94 0 0 0 3.4 0"]} title="Alertes & rappels">Rappels de vaccinations, alertes sanitaires automatiques et alertes épidémie régionales — push + SMS.</Feature>
            <Feature paths={["M4 19.5A2.5 2.5 0 0 1 6.5 17H20", "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z", "M9 7h7M9 11h5"]} title="Base de connaissances">Plus de 100 fiches pathologiques : description, observations terrain, prévention — consultables hors-ligne.</Feature>
            <Feature paths={["M3 3v18h18", "M7 14l4-4 3 3 5-6"]} title="Tableaux de bord">Effectifs, taux de mortalité et natalité, dépenses vétérinaires et pertes évitées. Rapports PDF.</Feature>
          </div>
        </div>

        {/* ===================== HOW IT WORKS ===================== */}
        <div style={{ padding: "0 56px 76px" }}>
          <div style={{ marginBottom: 44 }}>
            <div style={{ font: "700 13px 'Space Grotesk',sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: C.greenDk, marginBottom: 12 }}>{t("how.eyebrow")}</div>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 42, color: C.ink, margin: 0, letterSpacing: "-.02em" }}>{t("how.h2")}</h2>
          </div>
          <div data-grid style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0, position: "relative" }}>
            <div style={{ position: "absolute", top: 23, left: "7%", right: "7%", height: 2, background: "#E2D6C6" }} />
            <Step n="1" title="Décrivez les symptômes">L'assistant IA pose les bonnes questions. Ajoutez photos et vidéos.</Step>
            <Step n="2" title="Recevez une pré-analyse">Pathologies probables, conseils de prévention et niveau d'urgence.</Step>
            <Step n="3" title="Téléconsultez un vétérinaire">Messagerie, audio ou vidéo, avec accès au carnet de santé complet.</Step>
            <Step n="4" last title="Suivez le traitement">Ordonnance électronique, points de vente et contrôle de guérison.</Step>
          </div>
        </div>

        {/* ===================== POUR QUI ===================== */}
        <div id="who" style={{ background: C.brown, margin: "0 56px 76px", borderRadius: 24, padding: "56px 48px" }}>
          <div style={{ marginBottom: 46 }}>
            <div style={{ font: "700 13px 'Space Grotesk',sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: "#7BD389", marginBottom: 12 }}>{t("nav.who")}</div>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 42, color: "#fff", margin: 0, letterSpacing: "-.02em" }}>{t("who.h2")}</h2>
          </div>
          <div data-grid style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
            {[
              ["Éleveur", "Suivez votre troupeau, anticipez les maladies et consultez sans vous déplacer. Registre, carnet de santé et alertes au creux de la main."],
              ["Vétérinaire", "Agenda, file d'attente, dossiers patients et historique des actes. Honoraires reversés automatiquement par Mobile Money."],
              ["Autorité sanitaire", "Remontée anonymisée des données, cartographie des foyers de maladies et diffusion des alertes et campagnes officielles."],
            ].map(([tag, body], i) => (
              <div key={i} style={{ background: C.brownMid, border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 28 }}>
                <div style={{ display: "inline-flex", padding: "9px 13px", borderRadius: 8, background: "rgba(59,182,76,.15)", color: C.greenLt, font: "700 12px 'Space Grotesk',sans-serif", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 18 }}>{tag}</div>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: "#D8C5B2", margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ===================== KNOWLEDGE BASE ===================== */}
        <div id="kb" style={{ background: "#EAF6E9", padding: "80px 56px" }}>
          <div data-grid style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 54, alignItems: "center" }}>
            <div>
              <div style={{ font: "700 13px 'Space Grotesk',sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: C.greenDk, marginBottom: 14 }}>{t("nav.kb")}</div>
              <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 42, lineHeight: 1.06, color: "#1F4D24", margin: "0 0 20px", letterSpacing: "-.02em" }}>{t("kb.h2")}</h2>
              <p style={{ fontSize: 17, lineHeight: 1.6, color: "#3E5C40", margin: "0 0 26px" }}>Chaque fiche décrit la pathologie, les observations terrain, la prévention et les informations destinées au vétérinaire. Elle alimente l'assistant IA et forme les éleveurs.</p>
              <div style={{ display: "flex", gap: 30, flexWrap: "wrap" }}>
                <div><div style={{ font: "700 30px 'Space Grotesk',sans-serif", color: C.greenDk }}>100 FCFA</div><div style={{ fontSize: 13, color: "#4E6B4F" }}>par consultation de fiche</div></div>
                <div><div style={{ font: "700 30px 'Space Grotesk',sans-serif", color: C.greenDk }}>Hors-ligne</div><div style={{ fontSize: 13, color: "#4E6B4F" }}>consultable sans réseau</div></div>
              </div>
            </div>
            <div style={{ background: "#fff", borderRadius: 16, padding: 26, boxShadow: "0 20px 40px -22px rgba(31,77,36,.4)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ font: "700 11px 'Space Grotesk',sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#9A8979" }}>Fiche technique</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "#C0392B", padding: "4px 9px", borderRadius: 999 }}>Contagieux</span>
              </div>
              <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 24, color: C.ink, margin: "0 0 16px" }}>Fièvre aphteuse</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                {[
                  ["Description", "Maladie virale très contagieuse touchant bovins, ovins et caprins."],
                  ["Observations terrain", "Salivation excessive, boiterie, vésicules sur la langue et les onglons."],
                  ["Prévention", "Vaccination, isolement des sujets atteints, contrôle des mouvements."],
                ].map(([label, body], i) => (
                  <div key={i}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: C.greenDk, marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 14, lineHeight: 1.5, color: "#5A4A3E" }}>{body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ===================== PRICING ===================== */}
        <div id="pricing" style={{ padding: "80px 56px 72px" }}>
          <div style={{ textAlign: "center", marginBottom: 46 }}>
            <div style={{ font: "700 13px 'Space Grotesk',sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: C.greenDk, marginBottom: 12 }}>{t("nav.pricing")}</div>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 42, color: C.ink, margin: "0 0 10px", letterSpacing: "-.02em" }}>{t("price.h2")}</h2>
            <p style={{ fontSize: 16, color: C.body, margin: 0 }}>Fonctions de base gratuites. Paiement et abonnement par Mobile Money.</p>
          </div>
          <div data-grid style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, alignItems: "stretch" }}>
            <div style={{ border: "1px solid #ECE3D6", borderRadius: 16, padding: 30, background: "#fff", display: "flex", flexDirection: "column" }}>
              <h3 style={{ font: "700 18px 'Space Grotesk',sans-serif", color: C.ink, margin: "0 0 6px" }}>Gratuit</h3>
              <div style={{ font: "700 36px 'Space Grotesk',sans-serif", color: C.ink, marginBottom: 18 }}>0 FCFA</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 11 }}>
                {["Registre numérique du cheptel", "Carnet de santé & rappels", "Assistant IA de pré-analyse"].map((x, i) => (
                  <li key={i} style={{ fontSize: 14.5, color: "#5A4A3E", display: "flex", gap: 9 }}><span style={{ color: C.green, fontWeight: 800 }}>✓</span> {x}</li>
                ))}
              </ul>
              <button style={{ marginTop: "auto", border: "1.5px solid #C9B8A4", background: "transparent", color: "#532517", font: "700 15px 'Hanken Grotesk',sans-serif", padding: 13, borderRadius: 8, cursor: "pointer" }}>Commencer gratuitement</button>
            </div>
            <div style={{ borderRadius: 16, padding: 30, background: "linear-gradient(160deg,#3BB64C,#2E9A3E)", color: "#fff", display: "flex", flexDirection: "column", position: "relative" }}>
              <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: "#532517", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", padding: "5px 14px", borderRadius: 999 }}>Recommandé</div>
              <h3 style={{ font: "700 18px 'Space Grotesk',sans-serif", margin: "0 0 6px" }}>Premium</h3>
              <div style={{ font: "700 36px 'Space Grotesk',sans-serif", marginBottom: 18 }}>Abonnement</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 11 }}>
                {["Téléconsultations (audio & vidéo)", "IA avancée & score de risque", "Tableaux de bord & rapports PDF", "Mode hors-ligne complet"].map((x, i) => (
                  <li key={i} style={{ fontSize: 14.5, color: "#EAFBE9", display: "flex", gap: 9 }}><span style={{ fontWeight: 800 }}>✓</span> {x}</li>
                ))}
              </ul>
              <button style={{ marginTop: "auto", border: "none", background: "#fff", color: C.greenDk, font: "700 15px 'Hanken Grotesk',sans-serif", padding: 14, borderRadius: 8, cursor: "pointer" }}>S'abonner</button>
            </div>
            <div style={{ border: "1px solid #ECE3D6", borderRadius: 16, padding: 30, background: "#fff", display: "flex", flexDirection: "column" }}>
              <h3 style={{ font: "700 18px 'Space Grotesk',sans-serif", color: C.ink, margin: "0 0 6px" }}>Fiche à l'unité</h3>
              <div style={{ font: "700 36px 'Space Grotesk',sans-serif", color: C.ink, marginBottom: 18 }}>100 FCFA</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 11 }}>
                <li style={{ fontSize: 14.5, color: "#5A4A3E", display: "flex", gap: 9 }}><span style={{ color: C.green, fontWeight: 800 }}>✓</span> Consultation d'une fiche pathologique</li>
                <li style={{ fontSize: 14.5, color: "#5A4A3E", display: "flex", gap: 9 }}><span style={{ color: C.green, fontWeight: 800 }}>✓</span> Accessible éleveur & vétérinaire</li>
                <li style={{ fontSize: 14.5, color: "#5A4A3E", display: "flex", gap: 9 }}><span style={{ color: "#9A8979", fontWeight: 800 }}>·</span> Consultation en ligne, non téléchargeable</li>
              </ul>
              <button style={{ marginTop: "auto", border: "1.5px solid #C9B8A4", background: "transparent", color: "#532517", font: "700 15px 'Hanken Grotesk',sans-serif", padding: 13, borderRadius: 8, cursor: "pointer" }}>Explorer les fiches</button>
            </div>
          </div>
        </div>

        {/* ===================== MOBILE MONEY ===================== */}
        <div data-grid style={{ margin: "0 56px 76px", background: C.brown, borderRadius: 18, padding: "40px 44px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32, flexWrap: "wrap" }}>
          <div style={{ maxWidth: 560 }}>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 28, color: "#fff", margin: "0 0 8px" }}>{t("mm.h3")}</h3>
            <p style={{ fontSize: 16, lineHeight: 1.55, color: "#D8C5B2", margin: 0 }}>Consultations et abonnements réglés par <b style={{ color: "#fff" }}>Orange Money</b> et <b style={{ color: "#fff" }}>MTN MoMo</b> — carte bancaire à venir. Honoraires reversés automatiquement aux vétérinaires.</p>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ background: "#FF6600", color: "#fff", fontWeight: 800, fontSize: 15, padding: "18px 22px", borderRadius: 12, textAlign: "center", lineHeight: 1.25 }}>Orange<br />Money</div>
            <div style={{ background: "#FFCC00", color: "#1a1a1a", fontWeight: 800, fontSize: 15, padding: "18px 22px", borderRadius: 12, textAlign: "center", lineHeight: 1.25 }}>MTN<br />MoMo</div>
          </div>
        </div>

        {/* ===================== FAQ ===================== */}
        <div style={{ padding: "0 56px 80px" }}>
          <div style={{ marginBottom: 40 }}>
            <div style={{ font: "700 13px 'Space Grotesk',sans-serif", letterSpacing: ".14em", textTransform: "uppercase", color: C.greenDk, marginBottom: 12 }}>{t("nav.faq")}</div>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 42, color: C.ink, margin: 0, letterSpacing: "-.02em" }}>{t("faq.h2")}</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Faq open q="L'application fonctionne-t-elle sans connexion ?" a="Oui. Consultation des fiches et saisie des données hors-ligne, avec synchronisation automatique au retour du réseau." />
            <Faq q="Le chatbot remplace-t-il le vétérinaire ?" a="Non. L'assistant fournit une orientation et une pré-analyse ; le diagnostic final relève toujours d'un vétérinaire." />
            <Faq q="Comment payer les consultations ?" a="Par Mobile Money (Orange Money, MTN MoMo). La carte bancaire sera intégrée à terme." />
            <Faq q="En quelles langues l'application est-elle disponible ?" a="En français, anglais et fulfulde (peul), pour s'adapter au milieu rural." />
            <Faq q="Comment devenir vétérinaire partenaire ?" a="L'inscription des praticiens inclut la vérification de l'inscription à l'Ordre des vétérinaires avant habilitation." />
          </div>
        </div>

        {/* ===================== FINAL CTA ===================== */}
        <div style={{ background: C.green, color: "#fff", padding: "74px 56px", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 46, margin: "0 0 16px", letterSpacing: "-.02em" }}>{t("cta.h2")}</h2>
          <p style={{ fontSize: 18, color: "#EAFBE9", margin: "0 auto 32px", maxWidth: 560, lineHeight: 1.55 }}>Rejoignez la première plateforme de télémédecine vétérinaire pensée pour le monde rural camerounais.</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={APK_URL} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, background: C.ink, padding: "12px 22px", borderRadius: 10 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#5FCB6B"><path d="M3.6 2.2c-.3.3-.5.8-.5 1.4v16.8c0 .6.2 1.1.5 1.4l.1.1L13 12.5v-.2L3.7 2.1l-.1.1zM16.5 15.9l-3.1-3.1v-.2l3.1-3.1.1.1 3.7 2.1c1 .6 1 1.6 0 2.2l-3.8 2.1-.1-.1zM13.4 12.3l3.2 3.2-9.5 5.4c-.6.3-1.1.2-1.5-.1l7.8-8.5zM5.6 2.9c-.4-.3-.9-.4-1.5-.1l9.3 5.3-3.2 3.2L5.6 2.9z" /></svg>
              <div style={{ textAlign: "left", lineHeight: 1.2 }}><div style={{ fontSize: 10, color: "#aaa" }}>Télécharger l'APK</div><div style={{ fontSize: 16, fontWeight: 700 }}>Android</div></div>
            </a>
            <a href={APK_URL} style={{ textDecoration: "none", border: "1.5px solid rgba(255,255,255,.55)", background: "transparent", color: "#fff", font: "700 15px 'Hanken Grotesk',sans-serif", padding: "13px 26px", borderRadius: 10, display: "inline-flex", alignItems: "center" }}>Devenir vétérinaire partenaire</a>
          </div>
        </div>

        {/* ===================== FOOTER ===================== */}
        <div data-grid style={{ background: C.ink, color: "#C9B6A2", padding: "44px 56px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span style={{ background: "#fff", borderRadius: 9, padding: "5px 7px", display: "inline-flex" }}><img src={LOGO} alt="" style={{ height: 26, display: "block" }} /></span>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ font: "700 18px 'Space Grotesk',sans-serif" }}><span style={{ color: "#fff" }}>Mokine</span><span style={{ color: C.greenLt }}>Veto</span></div>
              <div style={{ fontSize: 11, color: "#8A7159" }}>Télémédecine vétérinaire · Cameroun</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: "#8A7159" }}>© 2026 MokineVeto — Remote Healthcare. Tous droits réservés.</div>
        </div>
      </div>
    </div>
  );
}

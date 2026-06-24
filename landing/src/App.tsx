import './index.css';

const APK_URL = 'https://github.com/efoka24-ops/mokineveto/releases/latest/download/mokinevet.apk';

const FEATURES = [
  {
    ic: '🩺',
    title: 'Téléconsultation',
    text: "Consultez un vétérinaire par message, appel audio ou vidéo, sans vous déplacer.",
  },
  {
    ic: '🤖',
    title: 'Assistant de pré-analyse',
    text: "Un assistant intelligent recueille les symptômes, oriente et évalue le niveau d'urgence.",
  },
  {
    ic: '🐄',
    title: 'Registre du cheptel',
    text: "Carnet de santé numérique : vaccinations, traitements, reproduction et croissance.",
  },
  {
    ic: '🔔',
    title: 'Alertes & rappels',
    text: "Rappels de vaccination et alertes sanitaires par notification, SMS ou e-mail.",
  },
  {
    ic: '📚',
    title: 'Fiches techniques',
    text: "Plus de 100 fiches pathologiques : description, observations terrain et prévention.",
  },
  {
    ic: '💳',
    title: 'Paiement Mobile Money',
    text: "Réglez vos consultations par Orange Money ou MTN MoMo, en toute sécurité.",
  },
];

function Brand() {
  return (
    <span className="brand">
      <span className="mokine">MOKINE</span>
      <span className="vet">VET</span>
    </span>
  );
}

export default function App() {
  return (
    <>
      <header className="nav">
        <div className="container nav" style={{ border: 'none', padding: 0, background: 'transparent' }}>
          <Brand />
          <nav className="nav-links">
            <a href="#features">Fonctionnalités</a>
            <a href="#how">Comment ça marche</a>
            <a href="#download">Télécharger</a>
            <a className="btn btn-green" href={APK_URL}>Installer l'app</a>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="badge">🐐 Télémédecine vétérinaire — Cameroun</span>
            <h1>
              La santé de votre <span>cheptel</span>, à portée de main.
            </h1>
            <p>
              MokineVet connecte les éleveurs aux vétérinaires ruraux : pré-analyse intelligente,
              téléconsultation, carnet de santé et marketplace — même en zone reculée.
            </p>
            <div className="hero-cta">
              <a className="btn btn-green" href={APK_URL}>⬇️ Télécharger l'APK</a>
              <a className="btn btn-outline" href="#how">Voir comment ça marche</a>
            </div>
            <div className="hero-stats">
              <div className="stat"><div className="num">100+</div><div className="lbl">Fiches techniques</div></div>
              <div className="stat"><div className="num">3</div><div className="lbl">Langues (fr · en · ff)</div></div>
              <div className="stat"><div className="num">24/7</div><div className="lbl">Accès aux vétos</div></div>
            </div>
          </div>

          <div className="phone-wrap">
            <div className="phone">
              <div className="phone-top"><Brand /></div>
              <div className="phone-body">
                <div className="skeleton sk-card" />
                <div className="sk-pill" />
                <div className="skeleton sk-row" />
                <div className="skeleton sk-row" />
                <div className="skeleton sk-row" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features">
        <div className="container">
          <div className="section-head">
            <h2>Tout pour soigner et suivre vos animaux</h2>
            <p>Une application pensée pour le monde agricole et les vétérinaires en milieu rural.</p>
          </div>
          <div className="features">
            {FEATURES.map((f) => (
              <div className="feature" key={f.title}>
                <div className="ic">{f.ic}</div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" style={{ background: 'var(--bg-blue)' }}>
        <div className="container">
          <div className="section-head">
            <h2>Comment ça marche</h2>
            <p>Trois étapes pour obtenir un avis vétérinaire fiable.</p>
          </div>
          <div className="features">
            <div className="feature"><div className="ic">1️⃣</div><h3>Décrivez les symptômes</h3><p>L'assistant guide votre saisie et accepte photos et vidéos de l'animal.</p></div>
            <div className="feature"><div className="ic">2️⃣</div><h3>Recevez une orientation</h3><p>Pré-diagnostic, conseils de prévention et niveau d'urgence — l'avis final reste celui du vétérinaire.</p></div>
            <div className="feature"><div className="ic">3️⃣</div><h3>Téléconsultez & payez</h3><p>Prenez rendez-vous, échangez en visio et réglez par Mobile Money.</p></div>
          </div>
        </div>
      </section>

      <section id="download">
        <div className="container">
          <div className="download">
            <h2>Installez MokineVet maintenant</h2>
            <p>Téléchargez l'application Android et rejoignez la communauté des éleveurs connectés.</p>
            <div className="store-row">
              <a className="btn btn-green" href={APK_URL}>⬇️ Télécharger l'APK (Android)</a>
              <a className="btn btn-outline" style={{ color: '#fff', borderColor: '#fff' }} href="#features">En savoir plus</a>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="container foot-grid">
          <Brand />
          <span>© {new Date().getFullYear()} MokineVet — Remote Healthcare · Cameroun</span>
          <span>contact@mokineveto.cm</span>
        </div>
      </footer>
    </>
  );
}

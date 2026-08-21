# SPÉCIFICATION FONCTIONNELLE DÉTAILLÉE — MokineVeto

| | |
|---|---|
| Référence | SFD-MKNV-2026-v1.0 |
| Version | 1.0 — Initiale |
| Date | Août 2026 |
| Auteur | ZIEGOUBE FOKA Emmanuel — Gérant TRU GROUP SARL |
| Statut | En vigueur — Version de référence pour implémentation |
| Diffusion | Équipe de développement TRU GROUP · Partenaires techniques |

> Document déposé par l'auteur le 2026-08-21. Voir aussi `SPEC.md` (périmètre fonctionnel
> historique, source de vérité de l'implémentation actuelle).

## 1. Contexte et objectifs

### 1.1 Problème à résoudre
Ratio moyen de 1 vétérinaire pour 10 000 éleveurs en zone rurale d'Afrique subsaharienne :
mortalité animale évitable, pertes économiques pour les ménages ruraux, absence de traçabilité
sanitaire bloquant l'accès aux marchés d'exportation.

### 1.2 Vision produit
Première application mobile de télémédecine vétérinaire en Afrique subsaharienne francophone.
Connecte les éleveurs ruraux à des vétérinaires certifiés via un assistant IA multilingue de
pré-diagnostic et un système de consultation à distance, connecté et hors ligne.

### 1.3 Objectifs fonctionnels
- Diagnostic vétérinaire initial en moins de 5 minutes depuis un smartphone Android.
- Mise en relation directe éleveurs ↔ vétérinaires certifiés (messagerie, appel audio/vidéo).
- Dossier médical historisé par animal (santé, vaccinations, traitements, poids, reproduction).
- Prise de rendez-vous, facturation et paiement mobile intégré (Orange Money, MTN MoMo, Wave).
- Fonctionnement intégral hors connexion (offline-first) avec synchronisation différée.
- Langues : français, fulfulde, swahili, arabe (extension progressive).

## 2. Parties prenantes et profils utilisateurs

| Profil | Description | Besoins principaux | Contraintes spécifiques |
|---|---|---|---|
| Éleveur | Petit à moyen éleveur rural, smartphone Android bas de gamme, faible alphabétisation numérique | Diagnostic rapide, mise en relation véto, gestion du cheptel | Connexion intermittente, offline obligatoire, langues locales, icônes plutôt que texte |
| Vétérinaire | Privé ou public, certifié par l'Ordre national, smartphone ou tablette | Planning, consultations à distance, dossiers médicaux, facturation | Vérification de diplôme à l'inscription, interface plus riche |
| Administrateur | Équipe TRU GROUP, back-office web | Validation vétos, supervision, statistiques, litiges | Web uniquement, droits élevés, traçabilité totale |
| Institution partenaire | RAB, ministères de l'Élevage, ONG, FAO, bailleurs | Tableaux de bord épidémiologiques, données anonymisées, rapports | Lecture seule via API ou portail, données anonymisées |

## 3. Architecture fonctionnelle

| Couche | Contenu |
|---|---|
| Présentation | Application mobile Flutter (iOS/Android) · Interface éleveur · Interface vétérinaire · Back-office web React |
| Logique métier | Chatbot IA de pré-diagnostic · Moteur de mise en relation · Gestionnaire de rendez-vous · Moteur de facturation · Gestion du cheptel |
| Services tiers | Twilio (appel/vidéo/SMS) · Orange Money API · MTN MoMo API · Wave API · Google Maps API · Firebase (notifications) |
| Données | PostgreSQL (structuré) · SQLite local (offline) · Firebase Storage (médias) · Redis (cache sessions) |
| Sync & Offline | Moteur de synchronisation bidirectionnelle différée · File de conflits · Journalisation locale des actions hors connexion |

## 4. Spécifications fonctionnelles détaillées

### 4.1 Authentification & Gestion des comptes

#### 4.1.1 Inscription Éleveur
- Champs obligatoires : nom complet, numéro de téléphone (identifiant principal), langue préférée (FR / Fulfulde / Swahili / Arabe), région, zone géographique.
- Champs optionnels : email, photo de profil, description du cheptel (espèces, effectif approximatif).
- Vérification du numéro par OTP SMS (Twilio) à 6 chiffres, validité 10 minutes.
- Acceptation des CGU avec version lisible en langue choisie.
- Compte activé immédiatement après vérification OTP.

#### 4.1.2 Inscription Vétérinaire
- Champs obligatoires : nom, prénom, numéro d'ordre vétérinaire national, spécialités, zone d'intervention, téléphone, email.
- Upload obligatoire : copie du diplôme vétérinaire + carte d'ordre (JPG/PDF, max 5 Mo).
- Compte en attente de validation administrateur (délai cible : 48h ouvrées).
- Notification SMS + push à l'activation ou au refus motivé.
- Définition du tarif de consultation par défaut (modifiable à tout moment).

#### 4.1.3 Connexion & Sessions
- Connexion par téléphone + mot de passe (min. 8 caractères, 1 majuscule, 1 chiffre).
- Option : empreinte digitale ou Face ID (si appareil compatible).
- Option : code PIN à 4 chiffres pour accès rapide.
- JWT access token (1h) + refresh token (30 jours) en Secure Storage.
- Déconnexion automatique après 30 minutes d'inactivité (configurable).
- Réinitialisation du mot de passe par OTP SMS.
- Blocage du compte après 5 tentatives échouées (15 minutes).

#### 4.1.4 Gestion du profil
- Modification de toutes les données sauf le numéro de téléphone (identifiant immuable).
- Changement de langue à tout moment, appliqué immédiatement sans déconnexion.
- Suppression de compte avec anonymisation (RGPD / loi camerounaise sur les données personnelles).

### 4.2 Tableau de bord Éleveur
- Accueil visuel, 6 boutons principaux à icônes larges : Mon Cheptel · Consulter un Vétérinaire · Mes Animaux malades · Mes RDV · Mes Messages · Urgence.
- Widget météo local (API OpenWeather) avec alerte si conditions favorables aux épizooties (chaleur extrême, inondation).
- Bandeau d'alertes sanitaires régionales (maladies signalées dans la zone, campagnes de vaccination).
- Résumé des animaux : nombre par espèce, nombre avec dossier médical actif, vaccinations à venir.
- Bouton Urgence rouge visible sur tout écran : demande de consultation prioritaire.

### 4.3 Tableau de bord Vétérinaire
- Statut de disponibilité (En ligne / Occupé / Hors ligne) modifiable en un tap, visible par les éleveurs.
- File d'attente des consultations en cours et en attente de réponse.
- Planning du jour : RDV programmés avec heure, éleveur, animal, motif.
- Indicateurs : consultations du mois, taux de réponse, note moyenne, revenus du mois.
- Alertes : nouvelles demandes, messages non lus, paiements reçus.
- Accès rapide aux dossiers médicaux des animaux suivis.

### 4.4 Chatbot IA — Pré-analyse des pathologies

#### 4.4.1 Description fonctionnelle
Cœur différenciateur de MokineVeto. L'éleveur décrit les symptômes de son animal et reçoit une
pré-analyse orientant vers les pathologies les plus probables, avec recommandations d'urgence et
suggestions d'action.

#### 4.4.2 Flux conversationnel
1. L'éleveur sélectionne ou saisit l'animal concerné (depuis son cheptel ou en création rapide).
2. Le chatbot pose des questions structurées en langage naturel : espèce confirmée, âge estimé, symptômes observés (liste à cocher + saisie libre), durée des symptômes, autres animaux affectés, contexte (eau, alimentation, déplacements récents).
3. Analyse IA : moteur NLP (modèle fine-tuné sur la base RADRES-Afrique + corpus OIE) générant une liste pondérée de pathologies probables avec score de probabilité.
4. Affichage : pathologie(s) probable(s), niveau d'urgence (vert / orange / rouge), recommandation immédiate (isolement, hydratation, traitement de première urgence), suggestion d'orientation (vétérinaire en ligne / déplacement urgence).
5. Option : transmettre le résumé de la conversation à un vétérinaire disponible pour prise en charge immédiate.

#### 4.4.3 Entrées supportées
- Texte libre en français, fulfulde, swahili, arabe.
- Saisie vocale avec transcription automatique (Speech-to-Text : Google ou Whisper OpenAI).
- Photo de l'animal ou de la lésion (analyse d'image par modèle CNN fine-tuné).
- Sélection dans une liste de symptômes illustrés par pictogrammes (accessibilité non-lecteurs).

#### 4.4.4 Base de connaissances
- Maladies couvertes (phase 1) : fièvre aphteuse, charbon bactéridien, pasteurellose, PPCB, fièvre de la vallée du Rift, brucellose, dermatophilose, trypanosomiase, coccidiose, botulisme, newcastle (volailles), PPR.
- Espèces couvertes (phase 1) : bovins, caprins, ovins, porcins, volailles, camelins.
- Mise à jour mensuelle via l'interface d'administration, contributions validées par vétérinaires experts référencés.
- Mode dégradé offline : base locale compressée (top 30 maladies) sans connexion.

### 4.5 Consultation à distance

#### 4.5.1 Types de consultation

| Type | Description | Délai cible | Tarification |
|---|---|---|---|
| Chat texte | Messages texte + photos/vidéos entre éleveur et vétérinaire | Réponse sous 2h | Forfait à définir |
| Appel audio | Appel vocal chiffré via Twilio WebRTC | Immédiat (si véto disponible) | À la minute |
| Consultation vidéo | Appel vidéo chiffré, partage d'écran, zoom caméra | Immédiat | À la minute |
| Urgence | Demande prioritaire broadcastée aux 5 vétérinaires disponibles les plus proches | < 10 min | Majoration +20 % |
| Différé (rapport écrit) | Symptômes soumis, réponse par rapport structuré | Sous 24h | Forfait fixe |

#### 4.5.2 Flux de prise en charge
1. L'éleveur initie une demande (depuis le chatbot ou directement) : type de consultation + animal concerné.
2. Le système cherche un vétérinaire disponible : d'abord le vétérinaire habituel, sinon les vétérinaires disponibles dans la zone, sinon tous les vétérinaires disponibles.
3. Notification push au vétérinaire sélectionné ; délai d'acceptation 3 minutes avant reroutage.
4. Acceptation → ouverture du canal (chat, audio ou vidéo).
5. Le vétérinaire rédige un rapport de fin de session (diagnostic, traitement prescrit, suivi recommandé, médicaments, posologie).
6. Le rapport est sauvegardé automatiquement dans le DMA de l'animal concerné.
7. Le paiement est déclenché en fin de session via l'API de paiement mobile sélectionnée.

### 4.6 Dossier Médical Animal (DMA)

#### 4.6.1 Création et identification de l'animal
- Identifiant unique automatique (UUID + QR code imprimable / partage NFC optionnel).
- Champs obligatoires : espèce, sexe, âge estimé ou date de naissance, nom/numéro d'identification local.
- Champs optionnels : race, poids, couleur/description physique, photo, statut reproductif.
- Animal rattaché au compte de l'éleveur, transférable (vente, cession) avec historique complet.

#### 4.6.2 Contenu du dossier médical
- Historique des consultations (date, vétérinaire, diagnostic, traitement, rapport PDF téléchargeable).
- Carnet de vaccination : vaccins administrés, dates, lot, prochaine échéance avec rappel automatique.
- Suivi pondéral : courbe de poids avec historique des pesées.
- Suivi reproductif : saillie, gestation, mise bas, numéros des descendants.
- Traitements en cours : médicaments, posologie, durée, alertes de fin de traitement.
- Alertes et signalements : maladies déclarées, quarantaines, contacts avec animaux malades.
- Documents : résultats d'analyses, certificats sanitaires, bons de livraison.

#### 4.6.3 Exportation
- Export PDF du dossier complet ou d'une période (certificat de santé, bilan de suivi).
- Export CSV pour intégration TRU TRACE (traçabilité) et TRU FARM ERP (gestion exploitation).
- Partage sécurisé avec un autre vétérinaire ou institution (lien temporaire chiffré, validité 7 jours).

### 4.7 Système de prise de rendez-vous
- Le vétérinaire définit ses créneaux dans un calendrier hebdomadaire (plages horaires, jours, durée par défaut).
- L'éleveur consulte les créneaux disponibles du vétérinaire choisi et en sélectionne un.
- Confirmation par notification push + SMS aux deux parties.
- Rappels automatiques : J-1 à 18h00 et H-1 avant le RDV.
- Annulation sans frais jusqu'à 2 heures avant ; au-delà, frais configurables par le vétérinaire (0 à 50 % du tarif).
- Report : le vétérinaire peut proposer un autre créneau en cas d'empêchement.
- File d'attente : inscription en liste d'attente et notification en cas de désistement.

### 4.8 Messagerie interne sécurisée
- Canal texte chiffré de bout en bout (AES-256) entre éleveur et vétérinaire.
- Types supportés : texte, photo, vidéo (max 50 Mo), PDF, audio (message vocal).
- Indicateurs de lecture (envoyé ✓ / lu ✓✓).
- Messages archivés dans le DMA de l'animal concerné si liés à une consultation.
- Disponible hors ligne : messages mis en file d'envoi et transmis à la reconnexion.
- Signalement de message abusif ou inapproprié avec modération administrateur.
- Archivage automatique après 2 ans, accessible sur demande.

### 4.9 Système de paiement et de facturation

#### 4.9.1 Méthodes de paiement supportées
- Orange Money (Cameroun, Côte d'Ivoire, Mali, Sénégal, Burkina Faso).
- MTN Mobile Money (Cameroun, Uganda, Rwanda, Ghana, Zambie, Bénin).
- Wave (Sénégal, Côte d'Ivoire, Burkina Faso, Mali).
- Airtel Money (Rwanda, Tanzanie, Kenya, Zambie, Malawi).
- M-Pesa (Kenya, Tanzanie, RDC).
- Carte bancaire (Stripe — marchés avec carte) — phase 2.

#### 4.9.2 Flux de paiement
1. En fin de consultation, génération automatique d'une facture détaillée (type, durée, tarif, taxes).
2. L'éleveur reçoit une notification de paiement avec le montant dû.
3. L'éleveur sélectionne son moyen de paiement et valide.
4. Confirmation envoyée aux deux parties (push + SMS).
5. Le vétérinaire reçoit le montant net (commission TRU GROUP : 15 %) sous 24h.

#### 4.9.3 Gestion financière vétérinaire
- Tableau de bord des revenus : par jour, semaine, mois, type de consultation.
- Retrait des gains vers compte mobile money ou bancaire (virement sous 48h).
- Export comptable : récapitulatif mensuel PDF + CSV.
- Portefeuille interne (wallet) pour les éleveurs fidèles avec option de recharge.

### 4.10 Géolocalisation & Annuaire vétérinaire
- Carte interactive (Google Maps SDK) des vétérinaires disponibles autour de l'éleveur.
- Filtres : espèce traitée, distance, disponibilité immédiate, tarif, note, langue parlée.
- Fiche vétérinaire : photo, spécialités, zone d'intervention, tarifs, note moyenne, avis, disponibilité temps réel.
- Mode téléconsultation vs déplacement à domicile, défini par le vétérinaire.
- Calcul d'itinéraire vers le cabinet (déplacement physique si nécessaire).
- Partage de localisation en temps réel lors d'une consultation d'urgence à domicile.
- Hors ligne : liste des 10 derniers vétérinaires consultés.

### 4.11 Notifications & Alertes

| Type d'alerte | Déclencheur | Canal |
|---|---|---|
| Rappel vaccination | 7 jours avant la date prévue dans le DMA | Push + SMS |
| Nouvelle demande de consultation | Éleveur initie une demande | Push + son |
| Réponse vétérinaire | Vétérinaire accepte / répond | Push + SMS |
| Rappel RDV | J-1 et H-1 avant le rendez-vous | Push + SMS |
| Paiement reçu | Transaction confirmée par l'API | Push + SMS |
| Alerte épizootique | Signalement dans la zone de l'éleveur | Push + SMS rouge |
| Fin de traitement | Date de fin d'un traitement du DMA | Push |
| Message non lu | Message reçu non ouvert depuis > 4h | Push |
| Mise à jour application | Nouvelle version disponible | In-app banner |

Chaque utilisateur peut désactiver individuellement chaque catégorie depuis les paramètres.

### 4.12 Mode hors-ligne (Offline-first)

#### 4.12.1 Principe
MokineVeto est pleinement fonctionnel sans connexion internet. Les données essentielles sont
répliquées localement via SQLite. Les actions hors ligne sont journalisées et synchronisées dès
la reconnexion.

#### 4.12.2 Fonctionnalités disponibles hors ligne
- Consultation du cheptel et des DMA de tous les animaux enregistrés.
- Chatbot IA en mode dégradé : base locale des 30 pathologies les plus fréquentes (sans analyse d'image).
- Saisie et enregistrement local de nouvelles fiches animaux.
- Saisie d'une nouvelle consultation ou d'un rapport (transmis à la reconnexion).
- Rédaction de messages (mis en file d'envoi).
- Accès aux 10 dernières notifications.
- Accès au calendrier des RDV programmés.

#### 4.12.3 Synchronisation
- Déclenchement automatique dès détection d'une connexion (WiFi, 3G, 4G).
- Gestion des conflits : last-write-wins pour les données non critiques ; pour les DMA médicaux, conflits signalés au vétérinaire pour arbitrage manuel.
- Indicateur visuel de synchronisation (barre de progression, icône en haut de l'écran).
- Log de synchronisation accessible en paramètres pour diagnostic.

### 4.13 Gestion du cheptel
- Vue d'ensemble par espèce avec compteurs (bovins, caprins, ovins, porcins, volailles, camelins).
- Recherche et filtrage : nom, numéro, espèce, état de santé, statut vaccinal.
- Ajout rapide d'un animal (3 champs minimum : espèce, sexe, âge).
- Import en lot : fichier CSV ou QR code (compatibilité TRU TRACE).
- Marquage des animaux décédés ou vendus (archivage, non suppression, pour conserver l'historique).
- Alertes cheptel : vaccinations expirées, quarantaine, traitement actif.
- Tableau de bord de santé du troupeau : pourcentage sains / sous surveillance / malades.
- Export du registre en PDF ou CSV (démarches administratives, crédit agricole, export).

### 4.14 Administration & Back-office (web)

#### 4.14.1 Gestion des utilisateurs
- Liste complète des éleveurs et vétérinaires avec statut, date d'inscription, activité récente.
- Validation / refus des inscriptions vétérinaires avec motif écrit notifié par email et SMS.
- Suspension / bannissement temporaire ou permanent avec journalisation de la raison.
- Réinitialisation forcée du mot de passe.

#### 4.14.2 Supervision des consultations
- Tableau de bord temps réel : consultations en cours, en attente, terminées dans la journée.
- Accès aux logs de consultation (sans accès au contenu médical chiffré) pour résolution de litiges.
- Médiation : signalements de litiges éleveur/vétérinaire, décision d'arbitrage, remboursement.

#### 4.14.3 Statistiques & Reporting
- Consultations par jour / semaine / mois / région.
- Maladies les plus fréquemment diagnostiquées par zone (cartographie épidémiologique).
- Revenus de la plateforme (commissions collectées), revenus par vétérinaire.
- Taux de rétention utilisateurs, taux de conversion chatbot → consultation payante.
- Export des données anonymisées pour les institutions partenaires (RAB, Ministère de l'Élevage, FAO).

## 5. Exigences non fonctionnelles

| Catégorie | Exigence | Critère de mesure |
|---|---|---|
| Performance | Chargement de l'écran d'accueil | < 2 secondes sur 3G |
| | Réponse du chatbot (mode connecté) | < 3 secondes |
| | Latence appel audio/vidéo | < 500 ms (Twilio WebRTC) |
| Disponibilité | Uptime serveur | 99,5 % minimum (hors maintenance planifiée) |
| | Maintenance planifiée | Dimanche 02h00-04h00 UTC |
| Scalabilité | Charge simultanée phase 1 | 1 000 utilisateurs actifs simultanés |
| | Charge phase 2 (Afrique de l'Est) | 50 000 utilisateurs actifs simultanés |
| Compatibilité | Android minimum | Android 8.0 (API 26) — 95 % des appareils Afrique |
| | iOS minimum | iOS 14 — phase 2 |
| | Taille APK | < 30 Mo |
| Stockage local | Espace requis sur appareil | < 100 Mo (DMA + base chatbot offline) |
| Accessibilité | Taille minimale des boutons tactiles | 48 × 48 dp (WCAG 2.1 AA) |
| | Contraste texte/fond | Ratio ≥ 4,5:1 (WCAG 2.1 AA) |

## 6. Stack technique recommandé

| Couche | Technologie | Justification |
|---|---|---|
| Mobile (frontend) | Flutter 3.x (Dart) | Codebase unique iOS + Android, performant sur bas de gamme, offline natif, rich UI |
| Backend (API) | Node.js + Express.js ou NestJS | Faible latence, scalabilité horizontale, JSON natif, maîtrisé par l'équipe |
| IA / NLP | Python + FastAPI (microservice) · modèle fine-tuné Llama 3 ou Mistral 7B | Flexibilité du fine-tuning, inférence locale possible, multilingue natif |
| Base de données | PostgreSQL (serveur) · SQLite / Hive (local) | PostgreSQL : robustesse, JSON natif, géospatial (PostGIS). SQLite/Hive : offline performant |
| Authentification | JWT + Firebase Auth (fallback) | Stateless, scalable, OTP SMS natif |
| Appels / Vidéo | Twilio Video + Voice SDK | Qualité réseau adaptative, chiffrement E2E, disponible en Afrique subsaharienne |
| Notifications push | Firebase Cloud Messaging (FCM) | Gratuit, fiable, Android prioritaire |
| SMS | Twilio SMS ou Africa's Talking | Africa's Talking : tarifs avantageux, routes locales directes |
| Paiement | Orange Money API · MTN MoMo API · Cinetpay · M-Pesa Daraja | Couverture Afrique centrale + Est + Ouest ; Cinetpay simplifie le multi-opérateurs |
| Cartographie | Google Maps SDK · OpenStreetMap (fallback offline) | Google Maps : qualité Afrique. OSM : offline et gratuit |
| Stockage médias | Firebase Storage · Cloudinary (images IA) | Intégration native ; transformations d'images pour l'IA |
| CI/CD | GitHub Actions · Fastlane | Automatisation builds, tests, déploiements stores |
| Monitoring | Firebase Crashlytics · Sentry · Grafana | Crashs temps réel, métriques serveur, alertes |

## 7. Sécurité & Conformité

### 7.1 Sécurité des données
- Chiffrement en transit : TLS 1.3 sur toutes les communications client-serveur.
- Chiffrement au repos : AES-256 pour les données médicales en base.
- Chiffrement de bout en bout (E2E) : messages et appels éleveur ↔ vétérinaire (clés Diffie-Hellman échangées à l'établissement de session).
- Données médicales inaccessibles à l'équipe TRU GROUP sans clé de déchiffrement détenue par l'utilisateur.
- Stockage local chiffré sur l'appareil (Secure Storage).

### 7.2 Sécurité applicative
- Protection contre les injections SQL (ORM Prisma, requêtes paramétrées).
- Protection CSRF + rate limiting (100 req/min par IP, 1 000 req/min par utilisateur authentifié).
- Validation et sanitisation de toutes les entrées côté serveur.
- Obfuscation du code mobile (R8/ProGuard pour Android).
- Journalisation des actions sensibles (accès DMA, modifications médicales) avec timestamp et identifiant utilisateur.
- Tests de pénétration tous les 6 mois.

### 7.3 Conformité réglementaire
- Loi camerounaise n°2010/012 du 21 décembre 2010 relative à la cybersécurité et à la cybercriminalité.
- RGPD (marchés Rwanda, Kenya, UE) : consentement explicite, droit à l'oubli, portabilité, DPO désigné.
- Données médicales animales considérées sensibles : conservation maximum 10 ans, archivage sécurisé après 2 ans d'inactivité.
- Hébergement des données africaines en Afrique (AWS af-south-1 Cape Town ou Google Cloud Johannesburg).

## 8. Internationalisation & Accessibilité

### 8.1 Langues supportées

| Langue | Phase 1 (lancement) | Phase 2 | Phase 3 |
|---|---|---|---|
| Français | ✅ Complet | | |
| Fulfulde | ✅ Complet | | |
| Anglais | ⚡ Partiel (UI) | ✅ Complet | |
| Swahili | | ✅ Complet | |
| Arabe | | | ✅ Complet (RTL) |
| Haoussa | | | ✅ Complet |

### 8.2 Accessibilité pour non-lecteurs
- Interface éleveur : navigation principalement par pictogrammes et icônes illustrées (espèces, symptômes visuels, organes).
- Chatbot : mode vocal — dictée des symptômes, réponse également à l'oral (Text-to-Speech).
- Taille de police ajustable (normal / grand / très grand).
- Mode haut contraste pour utilisation en plein soleil.
- Tutoriel interactif au premier lancement, démonstration animée en langue choisie.

## 9. Plan de tests

| Niveau de test | Périmètre | Outil | Responsable |
|---|---|---|---|
| Tests unitaires | Fonctions métier isolées : chatbot, calcul tarif, sync offline, validation OTP | Flutter Test, Jest, pytest | Développeurs |
| Tests d'intégration | Flux complets : inscription → consultation → paiement → DMA | Supertest, Postman Newman | Développeurs + QA |
| Tests UI (E2E) | Parcours utilisateur sur émulateurs et appareils réels | Flutter Integration Test, Appium | QA |
| Tests de charge | 1 000 utilisateurs simultanés, 50 consultations vidéo simultanées | k6, Artillery | DevOps |
| Tests offline | Fonctionnalités offline réseau coupé, puis synchronisation | Manuel + scripts | QA |
| Tests terrain (UAT) | Éleveurs pilotes (Maroua, Garoua) + vétérinaires partenaires — 4 semaines | Formulaires de retour structurés | Chef de projet + éleveurs |
| Tests de sécurité | Pentest : injection, authentification, chiffrement, exposition API | OWASP ZAP, Burp Suite | Expert sécurité externe |
| Tests de régression | Après chaque release : suite complète automatisée | CI/CD GitHub Actions | Automatique |

## 10. Glossaire

- **API** : Application Programming Interface — interface permettant à deux logiciels de communiquer.
- **Chatbot IA** : assistant conversationnel fondé sur l'IA, capable de comprendre et générer du langage naturel.
- **CI/CD** : Continuous Integration / Continuous Deployment — automatisation des tests et déploiements.
- **DMA** : Dossier Médical Animal — fiche numérique centralisant les informations sanitaires d'un animal.
- **E2E** : End-to-End — chiffrement où seuls l'émetteur et le destinataire peuvent lire les données.
- **Epizootie** : maladie infectieuse atteignant simultanément un grand nombre d'animaux d'une même espèce dans une région.
- **Flutter** : framework mobile de Google, applications iOS et Android depuis une base de code unique.
- **JWT** : JSON Web Token — standard ouvert d'authentification par tokens.
- **MVP** : Minimum Viable Product — version fonctionnelle minimale permettant de tester le concept.
- **NLP** : Natural Language Processing — traitement automatique du langage naturel.
- **OIE** : Organisation Mondiale de la Santé Animale (anciennement Office International des Épizooties).
- **Offline-first** : architecture conçue pour fonctionner sans connexion, avec synchronisation différée.
- **OTP** : One-Time Password — code à usage unique envoyé par SMS.
- **PPCB** : Péripneumonie Contagieuse Bovine.
- **PPR** : Peste des Petits Ruminants.
- **RAB** : Rwanda Agriculture and Animal Resources Development Board.
- **RGPD** : Règlement Général sur la Protection des Données.
- **SaaS** : Software as a Service.
- **SQLite** : base de données légère intégrée à l'application mobile, stockage local offline.
- **TLS** : Transport Layer Security.
- **WebRTC** : Web Real-Time Communication — appels audio/vidéo depuis une application.

---

*Document de référence — TRU GROUP SARL U · MokineVeto SFD v1.0 · Août 2026*
*ZIEGOUBE FOKA Emmanuel — Fondateur & Gérant — fokatx@gmail.com — +237 691 227 149*

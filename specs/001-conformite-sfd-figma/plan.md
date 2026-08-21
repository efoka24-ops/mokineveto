# Implementation Plan: Mise en conformité de l'application mobile avec la SFD et le design de référence

**Branch**: `mobile` | **Date**: 2026-08-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-conformite-sfd-figma/spec.md`

---

## Summary

L'application mobile couvre aujourd'hui le parcours éleveur — inscription, cheptel, pré-analyse,
annuaire, rendez-vous, messagerie texte, paiement mobile money — mais laisse sept écarts substantiels
avec la SFD : aucune interface praticien, aucune géolocalisation, aucune consultation audio ou vidéo,
un dossier médical incomplet et non exportable, un mode hors ligne réduit à trois actions en file
d'attente, aucune accessibilité pour non-lecteurs, et un tableau de bord éleveur amputé de ses
alertes. À cela s'ajoute un constat transverse : **le dépôt ne contient aucun test automatisé** et la
chaîne d'intégration continue ne comporte aucune porte de qualité, alors que la SFD §9 énonce huit
niveaux de test et que la §5 fixe des seuils chiffrés.

L'approche retenue est incrémentale et adossée à l'existant : le back-end couvre déjà une large part
du modèle de données et des routes ; les écarts se traitent par extension, non par remplacement. Le
travail se découpe en cinq blocs livrables indépendamment, ordonnés par la priorité des user stories,
précédés d'un socle de vérification sans lequel aucun seuil de la SFD n'est mesurable.

**Réserve bloquante** : la conformité au design (FR-051 à FR-054, SC-026, SC-027) ne peut pas être
travaillée en l'état — le fichier de maquettes n'est pas accessible au compte utilisé. Le bloc
correspondant est planifié mais reste en attente d'un déblocage d'accès.

---

## Technical Context

**Language/Version**: TypeScript ~6.0 — Node.js côté serveur, React Native 0.85 côté mobile

**Primary Dependencies**:
- Mobile : Expo SDK 56, React Native 0.85, React Navigation 7, zustand 5, i18next 26, socket.io-client 4
- Backend : Express, Prisma, socket.io, zod, helmet, jsonwebtoken, bcryptjs, node-cron, nodemailer, multer
- Web : React + Vite (`admin/`, `landing/`)

**Storage**: PostgreSQL via Prisma (22 modèles existants) côté serveur ; AsyncStorage + expo-secure-store
côté mobile. **Aucune base locale relationnelle** — c'est le manque structurant du mode hors ligne.

**Testing**: **inexistant**. Aucun framework, aucun test, aucune porte de qualité en CI. À créer
intégralement.

**Target Platform**: Android 8.0 (API 26) et supérieur, prioritaire ; iOS reporté en phase suivante

**Project Type**: application mobile + API + back-office web (monorepo à quatre paquets)

**Performance Goals** (SFD §5, mesurés sur appareil d'entrée de gamme et liaison mobile dégradée) :
accueil utilisable < 2 s ; orientation de l'assistant < 3 s ; latence audio/vidéo < 500 ms ;
démarrage à froid < 4 s

**Constraints**: stockage local < 100 Mo ; application livrée < 40 Mo par ABI ; disponibilité 99,5 % ;
cible tactile ≥ 48 × 48 dp ; contraste ≥ 4,5:1 ; hébergement des données africaines en Afrique

**Scale/Scope**: 1 000 utilisateurs actifs simultanés en phase courante, 50 000 en phase suivante ;
50 consultations audio/vidéo simultanées ; ~70 écrans mobiles existants, ~25 à créer ou reprendre

---

## Constitution Check

*GATE: à repasser après la conception détaillée.*

| Principe | Statut à l'entrée | Ce que le plan engage |
|---|---|---|
| I. Le terrain dicte la conception | **En écart** — aucun dispositif de vérification sur appareil bas de gamme ni sur réseau dégradé | Bloc 0 : profil d'appareil de référence, bridage réseau, mesures reproductibles |
| II. Hors ligne par défaut | **En écart** — 3 types d'actions en file d'attente, aucune réplication locale | Bloc 3 : base locale relationnelle, réplication du cheptel et des dossiers, idempotence, arbitrage des conflits |
| III. Donnée médicale sensible | **En écart partiel** — TLS et Secure Storage en place, mais ni chiffrement de bout en bout, ni chiffrement au repos, ni journalisation des accès | Bloc 4 : chiffrement E2E des échanges, chiffrement au repos, journal d'accès imputable |
| IV. Orientation ≠ diagnostic | **Conforme** — mention explicite présente dans le service d'assistance, repli local documenté | Maintenir ; étendre la mention au mode vocal et au mode dégradé hors ligne |
| V. Une seule source de vérité | **En écart partiel** — référentiel de style et i18n en place, mais valeurs en dur résiduelles à auditer | Bloc 5 : audit des valeurs en dur, extraction vers le référentiel |
| VI. Vérifier plutôt que déclarer | **En écart majeur** — aucun test, aucune mesure, aucune porte de qualité | Bloc 0 : socle de test intégral et portes de CI |

**Verdict** : le plan n'ouvre aucune dérogation. Il ne débute pas par des fonctionnalités mais par le
bloc 0, sans lequel le principe VI resterait violé pendant toute la durée des travaux et aucun seuil
de la SFD ne serait opposable.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-conformite-sfd-figma/
├── spec.md              # Spécification fonctionnelle (fait)
├── plan.md              # Ce fichier
├── research.md          # Décisions techniques et inconnues levées
├── tasks.md             # Découpage en tâches
└── checklists/
    └── requirements.md  # Validation qualité de la spec (fait)
```

### Source Code (repository root)

```text
backend/
├── prisma/schema.prisma          # 22 modèles ; extensions : pesées, reproduction,
│                                 #   journal d'accès DMA, partages temporaires, appels
├── src/
│   ├── routes/                   # existant : auth, animals, appointments, vets, chat,
│   │                             #   payments, ai, marketplace, alerts, fiches, admin
│   │                             # à créer : calls, geo, exports, sync, audit
│   ├── services/                 # camoo, mailer, otp ; à créer : rtc, storage, pdf
│   ├── middleware/               # auth ; à créer : rateLimit, auditLog
│   └── socket.ts                 # présence et statut de disponibilité praticien
└── tests/                        # À CRÉER — unitaires, intégration, charge

mobile/
├── src/
│   ├── screens/
│   │   ├── vet/                  # À CRÉER — tableau de bord praticien, file d'attente,
│   │   │                         #   planning, compte rendu, revenus, disponibilités
│   │   ├── herd/                 # à étendre — pesées, reproduction, export, QR
│   │   ├── vets/                 # à étendre — carte, filtres, itinéraire
│   │   ├── assistant/            # à étendre — dictée, restitution orale, pictogrammes
│   │   ├── call/                 # À CRÉER — appel audio et vidéo
│   │   └── home/                 # à étendre — alertes de zone, météo, urgence globale
│   ├── services/
│   │   ├── offlineQueue.ts       # à remplacer — base locale + idempotence + conflits
│   │   ├── db/                   # À CRÉER — persistance locale relationnelle
│   │   └── rtc.ts                # À CRÉER — liaison temps réel
│   ├── navigation/               # à étendre — aiguillage par rôle
│   └── theme/                    # à consolider — source unique des valeurs de style
└── tests/                        # À CRÉER — unitaires, composants, parcours

admin/                            # extensions : arbitrage des conflits médicaux,
                                  #   modération, supervision des appels
.github/workflows/                # à étendre — portes de qualité (voir bloc 0)
```

**Structure Decision** : monorepo existant conservé. Aucun paquet supplémentaire n'est introduit :
les besoins nouveaux se logent dans les paquets existants. Le seul ajout structurel est
l'arborescence de tests, absente à ce jour dans les quatre paquets.

---

## Blocs de travail

Les blocs sont ordonnés. Le bloc 0 conditionne la vérifiabilité de tous les autres ; les blocs 1 à 5
sont livrables indépendamment les uns des autres une fois le bloc 0 en place.

### Bloc 0 — Socle de vérification *(préalable, non négociable)*

**Pourquoi d'abord** : la SFD énonce vingt-sept critères chiffrés que rien ne mesure aujourd'hui.
Livrer des fonctionnalités avant ce socle reviendrait à déclarer une conformité invérifiable, ce que
le principe VI interdit.

**Contenu** :
1. Framework de test dans les quatre paquets ; tests unitaires sur les fonctions métier isolées —
   moteur de pré-analyse, calcul de tarif et de commission, validation OTP, file de synchronisation.
2. Tests d'intégration sur les flux complets : inscription → consultation → paiement → dossier
   médical, sur base de données jetable.
3. Tests de parcours sur émulateur et sur appareil réel, incluant les parcours hors ligne exécutés
   réseau coupé.
4. Banc de mesure de performance : profil d'appareil d'entrée de gamme, bridage réseau reproductible,
   relevé automatisé des seuils SFD §5.
5. Banc de montée en charge : montée à 1 000 utilisateurs simultanés, puis 50 consultations
   audio/vidéo simultanées, sur environnement de recette distinct de la production.
6. Analyse de sécurité automatisée en continu : dépendances, secrets, en-têtes, injections.
7. Portes de qualité en CI : typage, lint, tests, seuils de performance, analyse de sécurité — en
   échec bloquant, sur chaque proposition de modification.

**Critères de sortie** : SC-011 à SC-020 mesurables et mesurés ; chaîne CI rouge en cas de
régression.

---

### Bloc 1 — Interface vétérinaire *(P1 — FR-001 à FR-007)*

**Pourquoi** : sans praticien équipé, aucune consultation n'aboutit. C'est le seul écart qui rend le
produit non fonctionnel de bout en bout.

**Contenu** : aiguillage de navigation par rôle dès la connexion ; tableau de bord praticien ;
bascule de disponibilité propagée en temps réel via la liaison socket existante ; file d'attente et
planning du jour ; compte rendu structuré rendu obligatoire à la clôture et rattaché au dossier de
l'animal ; indicateurs d'activité ; gestion des créneaux, reports et frais d'annulation ; section
financière avec revenus par période, détail des commissions et demande de versement.

**Dépendances** : bloc 0. Le modèle de données couvre déjà l'essentiel (`VetProfile`,
`Availability`, `Appointment`, `HealthReport`, `Payment`, `Review`) ; l'extension porte surtout sur
l'interface et sur l'agrégation des revenus.

**Critères de sortie** : US1 vérifiée de bout en bout ; SC-005 à 100 %.

---

### Bloc 2 — Consultation à distance et géolocalisation *(P1 — FR-008 à FR-018)*

**Pourquoi** : la voix et l'image conditionnent l'usage par les éleveurs peu à l'aise avec l'écrit ;
la distance est le premier critère de choix d'un praticien en milieu rural.

**Contenu** :
- *Temps réel* : intégration d'un service de communication audio et vidéo chiffré ; dégradation
  automatique vers l'audio sur réseau faible ; décompte facturable suspendu à la perte de liaison et
  reprise de session ; acheminement des demandes selon la cascade praticien habituel → zone → au-delà,
  avec réacheminement après délai et garantie d'unicité du preneur en charge ; diffusion des urgences
  à plusieurs praticiens proches avec information de l'éleveur sur l'élargissement de la recherche.
- *Géolocalisation* : représentation cartographique des praticiens ; filtres — espèce, distance,
  disponibilité, tarif, note, langue ; calcul d'itinéraire ; partage de position en temps réel pendant
  une intervention urgente, cessant à la clôture ; repli hors connexion sur les praticiens récemment
  contactés ; fonctionnement dégradé si la localisation est refusée.

**Dépendances** : bloc 0 et bloc 1 — un appel suppose un praticien joignable. Dépend de la fourniture
d'un service de communication temps réel couvrant la zone géographique visée.

**Critères de sortie** : US2 et US3 vérifiées ; SC-003, SC-013 et SC-017 mesurés.

---

### Bloc 3 — Dossier médical complet et fonctionnement hors ligne *(P2 — FR-019 à FR-031)*

**Pourquoi** : ces deux sujets partagent le même socle — une persistance locale relationnelle et une
synchronisation sûre — et se traitent ensemble sous peine de réécriture.

**Contenu** :
- *Dossier médical* : identifiant visuel de l'animal ; suivi pondéral ; suivi reproductif ;
  traitements en cours et alertes de fin ; export du dossier sur période choisie sous forme
  présentable à un tiers ; partage à durée de validité limitée et révocable ; transfert d'animal
  conservant l'historique ; journalisation de tout accès et de toute modification.
- *Hors ligne* : remplacement de la file d'attente actuelle par une base locale relationnelle ;
  réplication du cheptel et des dossiers ; création et modification hors connexion des fiches, des
  observations et des messages ; base locale de pathologies pour l'orientation dégradée, signalée
  comme telle ; synchronisation automatique au retour du réseau avec progression et issue visibles ;
  identité stable des actions différées garantissant l'absence de double application ; détection des
  conflits médicaux et arbitrage humain via le back-office ; journal de synchronisation consultable.

**Dépendances** : bloc 0. Le point de vigilance est l'empreinte de stockage — SC-010 fixe 100 Mo pour
200 animaux avec historique, ce qui impose une stratégie de réplication sélective et de purge.

**Critères de sortie** : US4 et US5 vérifiées ; SC-007 à SC-010 mesurés, dont l'essai de 48 heures
hors connexion.

---

### Bloc 4 — Sécurité et conformité *(transverse — FR-024, FR-043 à FR-050)*

**Pourquoi** : la SFD §7 énonce des obligations dont aucune n'est aujourd'hui vérifiée, et dont
certaines — chiffrement de bout en bout, journal d'accès — sont structurantes et coûteuses à
rattraper après coup.

**Contenu** : chiffrement de bout en bout des échanges et des appels, avec établissement des clés à
l'ouverture de session ; chiffrement au repos des données médicales ; chiffrement du stockage local ;
limitation de débit par origine et par compte ; blocage temporaire après tentatives infructueuses ;
validation systématique des entrées côté serveur ; journal d'accès au dossier médical, imputable et
horodaté ; suppression de compte par anonymisation préservant les obligations de conservation ;
export des données personnelles à la demande ; archivage sécurisé au terme de la durée de
conservation ; signalement et modération des messages inappropriés ; obfuscation du code livré ;
vérification de l'absence de secret extractible ; revue de sécurité indépendante avant mise en
production.

**Dépendances** : bloc 0 pour l'analyse automatisée. Le chiffrement de bout en bout doit être arrêté
**avant** le bloc 2, sous peine de devoir reprendre la couche temps réel ; c'est la principale
contrainte d'ordonnancement du plan.

**Critères de sortie** : SC-021 à SC-025 vérifiés, dont l'absence de vulnérabilité de gravité élevée
ou critique à l'issue de la revue indépendante.

---

### Bloc 5 — Accessibilité, alertes et conformité au design *(P2/P3 — FR-032 à FR-042, FR-051 à FR-055)*

**Contenu** :
- *Accessibilité* : dictée des symptômes et restitution orale de l'orientation ; sélection des
  symptômes par pictogrammes ; réglage de la taille du texte ; mode de contraste renforcé pour usage
  en plein soleil ; vérification systématique des seuils de cible tactile et de contraste ; tutoriel
  de premier lancement dans la langue choisie ; changement de langue sans interruption de parcours.
- *Alertes* : accès à l'urgence depuis tout écran de l'espace éleveur ; bandeau d'alertes sanitaires
  de zone ; indicateur des conditions climatiques propices aux épizooties ; couverture complète du
  tableau des notifications de la SFD §4.11 ; désactivation par catégorie.
- *Design* : audit écran par écran contre les maquettes ; extraction des valeurs de style résiduelles
  vers le référentiel unique ; traitement des états non maquettés — chargement, vide, erreur, hors
  ligne ; consignation des écarts délibérés.
- *Périmètre* : réconciliation du module de vente de produits avec la SFD — intégration ou retrait,
  décision à porter par le propriétaire du produit.

**Dépendances** : la partie design est **bloquée** jusqu'à l'ouverture de l'accès aux maquettes. Les
parties accessibilité et alertes sont indépendantes et peuvent avancer sans ce déblocage.

**Critères de sortie** : US6 et US7 vérifiées ; SC-002 mesuré en test d'usage encadré ; SC-026 et
SC-027 conditionnés au déblocage de l'accès.

---

## Ordonnancement et chemin critique

```
Bloc 0 ──┬── Bloc 1 ──┬── Bloc 2
         │            │
         ├── Bloc 3   │
         │            │
         └── Bloc 4 ──┘   (le chiffrement E2E doit précéder le bloc 2)
         │
         └── Bloc 5   (partie design bloquée)
```

**Chemin critique** : Bloc 0 → Bloc 4 (volet chiffrement) → Bloc 1 → Bloc 2. Les blocs 3 et 5
avancent en parallèle sans contrainte d'ordre entre eux.

**Point de décision** : le volet chiffrement de bout en bout du bloc 4 doit être arrêté avant
d'engager le bloc 2. Intégrer une couche temps réel puis lui ajouter le chiffrement conduirait à la
reprendre entièrement.

---

## Risques

| Risque | Effet | Traitement |
|---|---|---|
| Accès aux maquettes non débloqué | FR-051 à FR-054 non vérifiables, SC-026 et SC-027 non mesurables | Escalade immédiate au propriétaire du produit ; à défaut, obtenir un export des écrans |
| Transcription vocale en fulfulde non couverte par les services courants | FR-032 partiellement irréalisable, US6 dégradée | À lever en phase de recherche ; repli sur les pictogrammes qui, seuls, satisfont déjà l'essentiel de US6 |
| Empreinte de stockage locale dépassant 100 Mo | Violation de SC-010 sur les gros cheptels | Réplication sélective, purge par ancienneté, mesure continue au banc du bloc 0 |
| Couverture réseau insuffisante pour la vidéo en zone rurale | SC-013 non atteignable en conditions réelles | Dégradation vers l'audio traitée comme un cas nominal, non comme une erreur |
| Absence totale de tests au départ | Toute modification risque une régression silencieuse | Bloc 0 en préalable, portes de CI bloquantes |
| Réconciliation du module de vente non tranchée | Périmètre flottant, effort non chiffrable | Décision demandée au propriétaire du produit avant l'ouverture du bloc 5 |

---

## Complexity Tracking

Aucune dérogation à la constitution n'est demandée. Le plan n'introduit ni paquet supplémentaire, ni
motif d'architecture non justifié par une exigence, ni technologie non déjà présente au dépôt — à
l'exception des services tiers explicitement prévus par la SFD §6 (communication temps réel,
cartographie, transcription vocale), qui relèvent d'exigences fonctionnelles et non de préférences
techniques.

# Tasks: Mise en conformité de l'application mobile avec la SFD et le design de référence

**Input**: Design documents from `/specs/001-conformite-sfd-figma/`

**Prerequisites**: [spec.md](./spec.md), [plan.md](./plan.md), [constitution](../../.specify/memory/constitution.md)

**Tests**: inclus et non optionnels. La SFD §9 énonce huit niveaux de test, la §5 vingt-sept seuils
chiffrés, et le principe VI de la constitution interdit de déclarer conforme ce qui n'est pas mesuré.
Le dépôt ne contient aujourd'hui **aucun test**.

## Format: `[ID] [P?] [Story] Description`

- **[P]** : parallélisable — fichiers distincts, aucune dépendance entre elles
- **[Story]** : user story couverte (US1…US7), ou `SEC` / `PERF` / `INFRA` pour les tâches transverses

---

## Phase 0 : Socle de vérification (préalable bloquant)

**Objectif** : rendre mesurable ce que la SFD exige. Aucun autre bloc ne démarre avant la fin de
cette phase.

**⚠️ Aucune tâche de fonctionnalité ne peut commencer tant que T001–T018 ne sont pas terminées.**

### Outillage de test

- [ ] T001 [INFRA] Installer et configurer le lanceur de tests dans `backend/` — scripts `test`,
      `test:watch`, `test:coverage` dans `backend/package.json`
- [ ] T002 [P] [INFRA] Installer et configurer le lanceur de tests dans `mobile/` avec le préréglage
      React Native — `mobile/package.json`
- [ ] T003 [P] [INFRA] Installer et configurer le lanceur de tests dans `admin/` — `admin/package.json`
- [ ] T004 [INFRA] Mettre en place une base de données jetable pour les tests d'intégration
      (conteneur éphémère ou schéma dédié), avec réinitialisation entre les suites
- [ ] T005 [INFRA] Créer les fabriques de données de test — éleveur, vétérinaire validé, animal avec
      historique, consultation, paiement — dans `backend/tests/factories/`

### Tests unitaires sur l'existant (SFD §9, niveau 1)

- [ ] T006 [P] [INFRA] Tests du moteur de pré-analyse `mobile/src/services/chatbot.ts` — règles de
      corrélation symptômes → pathologies, calcul du niveau d'urgence, repli local en cas d'échec
      distant
- [ ] T007 [P] [INFRA] Tests du calcul de tarif et de la commission de 15 % — arrondis, majoration
      d'urgence de 20 %, frais d'annulation tardive
- [ ] T008 [P] [INFRA] Tests de la validation OTP — format à 6 chiffres, expiration à 10 minutes,
      blocage après 5 tentatives, durée de blocage de 15 minutes
- [ ] T009 [P] [INFRA] Tests de la file de synchronisation `mobile/src/services/offlineQueue.ts` —
      empilement, purge, comportement sur échec réseau

### Tests d'intégration (SFD §9, niveau 2)

- [ ] T010 [INFRA] Test du flux complet inscription éleveur → OTP → connexion → création d'animal
- [ ] T011 [INFRA] Test du flux complet demande de consultation → acceptation → clôture → compte
      rendu rattaché au dossier de l'animal
- [ ] T012 [INFRA] Test du flux complet consultation → facture → paiement → confirmation aux deux
      parties
- [ ] T013 [P] [INFRA] Test du flux inscription vétérinaire → dépôt des pièces → validation
      administrateur → notification

### Bancs de mesure

- [ ] T014 [PERF] Définir le profil d'appareil de référence (entrée de gamme, Android 8) et le
      profil de bridage réseau (3G dégradée), documentés dans `specs/001-conformite-sfd-figma/`
- [ ] T015 [PERF] Banc de mesure des seuils SFD §5 côté mobile — accueil < 2 s, assistant < 3 s,
      démarrage à froid < 4 s, empreinte de stockage < 100 Mo, taille livrée < 40 Mo par ABI
- [ ] T016 [PERF] Banc de montée en charge — palier à 1 000 utilisateurs actifs simultanés, sur
      environnement de recette distinct de la production
- [ ] T017 [SEC] Analyse de sécurité automatisée — dépendances vulnérables, secrets committés,
      en-têtes de sécurité, tentatives d'injection

### Portes de qualité

- [ ] T018 [INFRA] Étendre `.github/workflows/` : typage, lint, tests unitaires, tests
      d'intégration, analyse de sécurité — **en échec bloquant** sur chaque proposition de
      modification. La CI actuelle ne fait que builder l'APK et déployer la vitrine.

**Point de contrôle** : SC-011 à SC-020 mesurables. Chaîne CI rouge en cas de régression. Les blocs
suivants peuvent démarrer.

---

## Phase 1 : Chiffrement de bout en bout (préalable au bloc temps réel)

**Objectif** : arrêter le schéma cryptographique **avant** d'intégrer la couche temps réel. L'ordre
inverse imposerait de reprendre entièrement cette couche.

- [ ] T019 [SEC] Concevoir le schéma d'échange de clés à l'établissement de session et le documenter
      dans `specs/001-conformite-sfd-figma/research.md`
- [ ] T020 [SEC] Implémenter le chiffrement de bout en bout de la messagerie texte —
      `backend/src/routes/chat.ts`, `mobile/src/screens/chat/`
- [ ] T021 [SEC] Chiffrer les données médicales au repos — `backend/prisma/schema.prisma`, couche
      d'accès aux dossiers
- [ ] T022 [P] [SEC] Chiffrer le stockage local sensible sur l'appareil — `mobile/src/services/`
- [ ] T023 [SEC] Vérifier qu'aucune donnée médicale n'est lisible côté exploitant sans le concours
      de l'utilisateur — test dédié couvrant SC-022

**Point de contrôle** : SC-022 et SC-024 vérifiés. Le bloc temps réel peut être engagé.

---

## Phase 2 : US1 — Interface vétérinaire (P1) 🎯 MVP

**Exigences couvertes** : FR-001 à FR-007

**Objectif** : équiper le praticien, sans quoi aucune consultation n'aboutit.

### Serveur

- [ ] T024 [US1] Route d'agrégation des indicateurs praticien — volume de consultations, taux de
      réponse, note moyenne, revenus de la période — `backend/src/routes/vets.ts`
- [ ] T025 [US1] Propagation en temps réel du statut de disponibilité via la liaison socket existante
      — `backend/src/socket.ts`
- [ ] T026 [US1] Route de demande de versement des gains et historique des versements —
      `backend/src/routes/payments.ts`
- [ ] T027 [P] [US1] Étendre la gestion des créneaux : report proposé par le praticien, frais
      d'annulation paramétrables dans la borne 0–50 % — `backend/src/routes/appointments.ts`

### Mobile

- [ ] T028 [US1] Aiguillage de navigation par rôle dès la connexion —
      `mobile/src/navigation/RootNavigator.tsx`
- [ ] T029 [US1] Tableau de bord praticien — statut, file d'attente, planning du jour, alertes —
      `mobile/src/screens/vet/VetDashboardScreen.tsx`
- [ ] T030 [P] [US1] Bascule de disponibilité en une action, reflétée en temps réel —
      `mobile/src/screens/vet/`
- [ ] T031 [P] [US1] Écran de file d'attente des consultations — `mobile/src/screens/vet/`
- [ ] T032 [P] [US1] Écran de planning du jour — éleveur, animal, motif par entrée —
      `mobile/src/screens/vet/`
- [ ] T033 [US1] Écran de compte rendu structuré — diagnostic, traitement, posologie, suivi —
      **rendu obligatoire avant clôture** — `mobile/src/screens/vet/`
- [ ] T034 [P] [US1] Écran des revenus — par période, détail des commissions, demande de versement —
      `mobile/src/screens/vet/`
- [ ] T035 [P] [US1] Écran de gestion des créneaux de disponibilité — `mobile/src/screens/vet/`

### Tests

- [ ] T036 [US1] Test de parcours : compte praticien validé → disponible → demande reçue → acceptée
      → clôturée avec compte rendu → compte rendu visible côté éleveur
- [ ] T037 [P] [US1] Test vérifiant qu'aucune consultation ne peut être clôturée sans compte rendu
      (SC-005 à 100 %)

**Point de contrôle** : US1 vérifiée de bout en bout. Le produit est fonctionnel de bout en bout pour
la première fois.

---

## Phase 3 : US2 + US3 — Consultation à distance et géolocalisation (P1)

**Exigences couvertes** : FR-008 à FR-018

**Dépend de** : phase 1 (chiffrement) et phase 2 (praticien joignable).

### Temps réel — US3

- [ ] T038 [US3] Intégrer le service de communication audio et vidéo chiffré côté serveur —
      `backend/src/services/rtc.ts`, `backend/src/routes/calls.ts`
- [ ] T039 [US3] Écrans d'appel audio et vidéo — `mobile/src/screens/call/`
- [ ] T040 [US3] Dégradation automatique vidéo → audio sur réseau faible, traitée comme cas nominal
- [ ] T041 [US3] Suspension du décompte facturable à la perte de liaison et reprise de session
- [ ] T042 [US3] Cascade d'acheminement — praticien habituel → zone → au-delà — avec réacheminement
      après 3 minutes et garantie qu'un seul praticien prend en charge une demande
- [ ] T043 [US3] Diffusion des urgences aux 5 praticiens disponibles les plus proches, avec
      information de l'éleveur sur l'élargissement progressif de la recherche
- [ ] T044 [P] [US3] Écran de récapitulatif de durée facturable présenté avant tout prélèvement

### Géolocalisation — US2

- [ ] T045 [US2] Requêtes géospatiales de recherche de praticiens par distance —
      `backend/src/routes/geo.ts`, extension géospatiale de la base
- [ ] T046 [US2] Carte des praticiens environnants avec distance et disponibilité temps réel —
      `mobile/src/screens/vets/`
- [ ] T047 [P] [US2] Filtres — espèce, distance, disponibilité immédiate, tarif, note, langue parlée
- [ ] T048 [P] [US2] Calcul d'itinéraire vers le lieu d'exercice du praticien
- [ ] T049 [US2] Partage de position en temps réel pendant une intervention urgente, **cessant à la
      clôture**
- [ ] T050 [P] [US2] Repli hors connexion sur les 10 derniers praticiens contactés
- [ ] T051 [P] [US2] Fonctionnement dégradé lorsque la localisation est refusée

### Tests

- [ ] T052 [US3] [PERF] Mesure de la latence audio/vidéo sur liaison mobile moyenne — seuil 500 ms
      (SC-013)
- [ ] T053 [US3] [PERF] Banc de 50 consultations audio/vidéo simultanées (SC-017)
- [ ] T054 [P] [US3] Test du cas limite : deux praticiens acceptent la même urgence au même instant
- [ ] T055 [P] [US3] Test du cas limite : perte de réseau du praticien pendant une consultation
      facturée à la durée
- [ ] T056 [P] [US2] Test de parcours géolocalisé et test du repli hors connexion

**Point de contrôle** : US2 et US3 vérifiées ; SC-003, SC-013 et SC-017 mesurés.

---

## Phase 4 : US4 + US5 — Dossier médical complet et fonctionnement hors ligne (P2)

**Exigences couvertes** : FR-019 à FR-031

**Traités ensemble** : ils partagent le socle de persistance locale et de synchronisation. Les
séparer imposerait une réécriture.

### Socle de persistance locale — US5

- [ ] T057 [US5] Introduire une base locale relationnelle sur l'appareil — `mobile/src/services/db/`
- [ ] T058 [US5] Réplication sélective du cheptel et des dossiers médicaux, avec stratégie de purge
      par ancienneté tenant l'empreinte sous 100 Mo (SC-010)
- [ ] T059 [US5] Remplacer `mobile/src/services/offlineQueue.ts` — actuellement limité à trois types
      d'actions et sans identité stable — par un journal d'actions différées à identité stable
      garantissant l'absence de double application (FR-029)
- [ ] T060 [US5] Synchronisation automatique au retour du réseau, avec progression et issue visibles
- [ ] T061 [US5] Détection des conflits sur données médicales et mise en file d'arbitrage —
      **jamais d'écrasement automatique** (FR-030)
- [ ] T062 [US5] Interface d'arbitrage des conflits médicaux dans le back-office — `admin/src/`
- [ ] T063 [P] [US5] Journal de synchronisation consultable depuis les paramètres
- [ ] T064 [US5] Base locale de pathologies pour l'orientation hors ligne, avec mention explicite du
      mode dégradé (FR-027, principe IV)
- [ ] T065 [P] [US5] Création et modification hors connexion des fiches animaux, des observations
      sanitaires et des messages

### Dossier médical — US4

- [ ] T066 [US4] Étendre le modèle de données — pesées, événements de reproduction, partages
      temporaires, journal d'accès — `backend/prisma/schema.prisma`
- [ ] T067 [P] [US4] Suivi pondéral avec courbe d'évolution — `mobile/src/screens/herd/`
- [ ] T068 [P] [US4] Suivi reproductif — saillie, gestation, mise bas, descendants
- [ ] T069 [P] [US4] Traitements en cours avec alerte de fin de traitement
- [ ] T070 [US4] Identifiant visuel de l'animal permettant de le retrouver sans saisie (FR-019)
- [ ] T071 [US4] Export du dossier médical, complet ou sur période choisie, sous forme présentable à
      un tiers — `backend/src/services/pdf.ts`, `backend/src/routes/exports.ts`
- [ ] T072 [P] [US4] Export du registre de cheptel pour démarches administratives et accès au crédit
- [ ] T073 [US4] Partage de dossier à durée de validité limitée et révocable (FR-022)
- [ ] T074 [US4] Transfert d'animal entre détenteurs conservant l'intégralité de l'historique
      sanitaire (FR-023)
- [ ] T075 [SEC] [US4] Journal de tout accès et de toute modification sur dossier médical, imputable
      et horodaté — `backend/src/middleware/auditLog.ts` (FR-024, SC-023)

### Tests

- [ ] T076 [US5] Essai hors ligne de 48 heures suivi d'une synchronisation — sans perte ni doublon
      (SC-008)
- [ ] T077 [P] [US5] Test vérifiant que 100 % des conflits médicaux sont soumis à arbitrage (SC-009)
- [ ] T078 [P] [US5] Test de l'ensemble des fonctions déclarées disponibles hors ligne, réseau coupé,
      sans message d'erreur technique (SC-007)
- [ ] T079 [P] [US5] [PERF] Mesure de l'empreinte de stockage pour 200 animaux avec historique
      (SC-010)
- [ ] T080 [P] [US4] Test de bout en bout de l'export et du partage temporaire, expiration comprise
- [ ] T081 [P] [US5] Test du cas limite : synchronisation interrompue puis reprise, sans double
      application
- [ ] T082 [P] [US4] Test du cas limite : suppression de compte avec dossiers médicaux rattachés

**Point de contrôle** : US4 et US5 vérifiées ; SC-007 à SC-010 mesurés.

---

## Phase 5 : Sécurité et conformité (transverse)

**Exigences couvertes** : FR-043 à FR-050 (FR-043 et FR-044 traitées en phase 1)

**Dépend de** : phase 0 pour l'analyse automatisée. La partie chiffrement a été traitée en phase 1.

- [ ] T083 [SEC] Limitation de débit — 100 requêtes/min par origine, 1 000/min par compte
      authentifié — `backend/src/middleware/rateLimit.ts` (FR-045)
- [ ] T084 [P] [SEC] Auditer et compléter la validation des entrées côté serveur sur l'ensemble des
      routes (FR-045, principe III)
- [ ] T085 [P] [SEC] Vérifier le blocage temporaire après 5 tentatives d'authentification
      infructueuses (FR-046)
- [ ] T086 [SEC] Suppression de compte par anonymisation, préservant les obligations de conservation
      sanitaire (FR-047, SC-025)
- [ ] T087 [P] [SEC] Export des données personnelles à la demande de l'utilisateur (FR-048)
- [ ] T088 [P] [SEC] Archivage sécurisé au terme de la durée de conservation (FR-049)
- [ ] T089 [P] [SEC] Signalement des messages inappropriés et traitement par la modération —
      `admin/src/` (FR-050)
- [ ] T090 [SEC] Activer l'obfuscation du code mobile livré et vérifier qu'aucun secret n'est
      extractible de l'application ni du stockage de l'appareil (SC-024)
- [ ] T091 [SEC] Vérifier l'hébergement des données africaines sur infrastructure localisée en
      Afrique (SFD §7.3) — **écart probable avec l'hébergement actuel, à confirmer**
- [ ] T092 [SEC] Revue de sécurité indépendante par un intervenant externe — aucune vulnérabilité de
      gravité élevée ou critique ouverte à la mise en production (SC-021)

**Point de contrôle** : SC-021 à SC-025 vérifiés.

---

## Phase 6 : US6 — Accessibilité pour non-lecteurs (P2)

**Exigences couvertes** : FR-032 à FR-037

- [ ] T093 [US6] Sélection des symptômes par pictogrammes, sans recours à la lecture (FR-033) —
      `mobile/src/screens/assistant/`
- [ ] T094 [US6] Dictée des symptômes avec transcription (FR-032) — **subordonné à la levée de
      l'inconnue sur la couverture du fulfulde**
- [ ] T095 [US6] Restitution orale de l'orientation et des recommandations (FR-032)
- [ ] T096 [P] [US6] Réglage de la taille du texte sur trois niveaux (FR-034)
- [ ] T097 [P] [US6] Mode de contraste renforcé pour usage en plein soleil (FR-034)
- [ ] T098 [US6] Audit et mise en conformité des cibles tactiles (≥ 48 × 48 dp) et des contrastes
      (≥ 4,5:1) sur l'ensemble des écrans (FR-035, SC-027)
- [ ] T099 [P] [US6] Tutoriel de premier lancement dans la langue choisie (FR-037)
- [ ] T100 [P] [US6] Vérifier le changement de langue sans interruption de parcours (FR-036)
- [ ] T101 [US6] Test d'usage encadré auprès d'éleveurs non-lecteurs — parcours complet sans lecture
      ni saisie, taux de réussite ≥ 80 % (SC-002)

---

## Phase 7 : US7 — Alertes et tableau de bord (P3)

**Exigences couvertes** : FR-038 à FR-042

- [ ] T102 [US7] Rendre l'accès à l'urgence disponible depuis tout écran de l'espace éleveur
      (FR-038) — `mobile/src/navigation/`
- [ ] T103 [P] [US7] Bandeau d'alertes sanitaires de zone sur le tableau de bord (FR-039)
- [ ] T104 [P] [US7] Indicateur des conditions climatiques propices aux épizooties (FR-040)
- [ ] T105 [US7] Couvrir l'intégralité du tableau des notifications SFD §4.11 — 9 déclencheurs, sur
      les canaux prévus pour chacun (FR-041)
- [ ] T106 [P] [US7] Désactivation par catégorie de notification, sans effet sur les autres (FR-042)
- [ ] T107 [P] [US7] Test du cas limite : heure d'appareil ou fuseau incorrect faussant les rappels

---

## Phase 8 : Conformité au design ⛔ BLOQUÉE

**Exigences couvertes** : FR-051 à FR-054

**⚠️ Cette phase ne peut pas démarrer.** Le fichier de maquettes n'est pas accessible au compte
utilisé : l'accès en lecture ne suffit pas à l'outillage, qui exige un accès éditeur. Aucune
vérification de conformité visuelle n'est possible en l'état.

**Déblocage requis du propriétaire du produit** : ouvrir l'accès éditeur au fichier de maquettes, ou
fournir un export des écrans de référence.

- [ ] T108 [BLOQUÉE] Obtenir l'accès au fichier de maquettes de référence
- [ ] T109 [BLOQUÉE] Inventorier les écrans maquettés et les apparier aux écrans implémentés
- [ ] T110 [BLOQUÉE] Audit écran par écran — composition, hiérarchie visuelle, libellés (FR-051)
- [ ] T111 Extraire les valeurs de style résiduelles codées en dur vers `mobile/src/theme/`
      (FR-052, SC-027) — *réalisable sans l'accès aux maquettes*
- [ ] T112 Traiter les états non maquettés — chargement, vide, erreur, hors ligne — sur l'ensemble
      des écrans (FR-054) — *réalisable sans l'accès aux maquettes*
- [ ] T113 [BLOQUÉE] Consigner les écarts délibérés avec leur justification (FR-053)

---

## Phase 9 : Réconciliation du périmètre

- [ ] T114 Porter au propriétaire du produit la décision sur le module de vente de produits —
      présent dans le code, absent de la SFD : intégration ou retrait (FR-055)
- [ ] T115 Appliquer la décision rendue et mettre à jour `SFD-MKNV-2026-v1.0.md` en conséquence
      (principe : un arbitrage non consigné est réputé non rendu)

---

## Phase 10 : Validation finale

- [ ] T116 [PERF] Campagne complète de mesure des seuils SFD §5 sur appareil de référence et réseau
      bridé — SC-011, SC-012, SC-014, SC-015
- [ ] T117 [PERF] Montée en charge à 1 000 utilisateurs actifs simultanés (SC-016) et vérification
      que l'architecture tient la cible de 50 000 sans réécriture (SC-018)
- [ ] T118 [PERF] Vérifier la disponibilité à 99,5 % hors maintenance annoncée (SC-019)
- [ ] T119 [P] [PERF] Vérifier qu'une interruption d'un service tiers — paiement, messagerie,
      cartographie — ne rend pas l'application inutilisable dans ses autres fonctions (SC-020)
- [ ] T120 Suite de régression complète automatisée sur l'ensemble des parcours
- [ ] T121 Recette terrain de 4 semaines auprès d'éleveurs pilotes et de vétérinaires partenaires,
      **sur appareils réels et non sur émulateur** (SFD §9)

### Critères de succès mesurés en recette terrain

Ces trois critères portent sur des délais de bout en bout vécus par l'utilisateur. Ils ne se
mesurent pas au banc mais en usage réel, et sont donc rattachés à T121.

- [ ] T122 [PERF] Mesurer le délai entre l'ouverture de l'application et l'obtention d'une
      orientation — seuil 5 minutes (SC-001)
- [ ] T123 [PERF] Mesurer le délai de réponse à une demande de consultation ordinaire — seuil
      2 heures dans 90 % des cas (SC-004)
- [ ] T124 [PERF] Mesurer le délai de production d'un justificatif sanitaire présentable à un tiers
      — seuil 2 minutes (SC-006)

---

## Dépendances entre phases

```
Phase 0 (socle) ──┬── Phase 1 (chiffrement) ── Phase 2 (US1) ── Phase 3 (US2+US3)
                  │
                  ├── Phase 4 (US4+US5)
                  ├── Phase 5 (sécurité)
                  ├── Phase 6 (US6)
                  ├── Phase 7 (US7)
                  └── Phase 8 (design) ⛔ bloquée

Phases 2 à 9 ── Phase 10 (validation finale)
```

**Chemin critique** : Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 10.

Les phases 4 à 7 avancent en parallèle du chemin critique, sans dépendance entre elles.

---

## Récapitulatif

| Phase | Périmètre | Tâches | État |
|---|---|---|---|
| 0 | Socle de vérification | T001–T018 | Préalable bloquant |
| 1 | Chiffrement de bout en bout | T019–T023 | Préalable à la phase 3 |
| 2 | US1 — Interface vétérinaire | T024–T037 | MVP fonctionnel |
| 3 | US2+US3 — Temps réel et géolocalisation | T038–T056 | |
| 4 | US4+US5 — Dossier médical et hors ligne | T057–T082 | |
| 5 | Sécurité et conformité | T083–T092 | |
| 6 | US6 — Accessibilité | T093–T101 | Une inconnue à lever |
| 7 | US7 — Alertes | T102–T107 | |
| 8 | Conformité au design | T108–T113 | ⛔ Bloquée |
| 9 | Réconciliation du périmètre | T114–T115 | Décision requise |
| 10 | Validation finale | T116–T124 | |

**Total** : 124 tâches, dont 4 bloquées par un accès manquant et 2 en attente d'une décision du
propriétaire du produit.

---

## Points requérant une décision du propriétaire du produit

Ces trois points sont hors de la main de l'équipe de développement et conditionnent une partie du
plan :

1. **Accès aux maquettes de référence** — bloque la phase 8 dans son intégralité, ainsi que SC-026
   et SC-027.
2. **Module de vente de produits** — présent dans le code, absent de la SFD. Effort non chiffrable
   tant que la décision n'est pas rendue.
3. **Hébergement des données** — la SFD §7.3 impose une localisation en Afrique ; l'hébergement
   actuel doit être confirmé, un écart étant probable (T091).

Deux autres points sont tranchés par défaut documenté et restent révisables sans blocage : le
phasage des langues (swahili et arabe reportés) et le report du portage iOS.

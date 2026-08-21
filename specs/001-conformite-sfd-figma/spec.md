# Feature Specification: Mise en conformité de l'application mobile avec la SFD et le design de référence

**Feature Branch**: `mobile`

**Created**: 2026-08-21

**Status**: Draft

**Input**: User description: "il faut s'assurer que l'application mobile respecte notre nouveau spec et le design figma — documenter le plan, les tâches, les fonctionnalités et les évolutions à faire, la sécurité et les tests de performance, de sécurité et de montée en charge"

---

## Contexte

L'application mobile MokineVeto existe déjà et couvre une part significative du périmètre :
authentification éleveur, cheptel, assistant de pré-analyse, annuaire vétérinaire, rendez-vous,
messagerie texte, paiement mobile money, fiches pathologiques, marketplace. La spécification
fonctionnelle de référence (SFD-MKNV-2026-v1.0) décrit un périmètre plus large, et un design de
référence existe dans un fichier de maquettes.

Cette feature ne crée pas un produit neuf : elle **ferme l'écart** entre l'application livrée et les
deux références (fonctionnelle et visuelle). Elle couvre également les exigences transverses de
sécurité et la stratégie de validation (performance, montée en charge, sécurité) que la SFD impose
mais qui ne sont aujourd'hui adossées à aucun dispositif de mesure.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Le vétérinaire exerce depuis l'application (Priority: P1)

Un vétérinaire certifié se connecte, se déclare disponible, voit les demandes de consultation
arriver, consulte le planning de sa journée, prend en charge un éleveur, rédige son compte rendu et
suit ses revenus. Aujourd'hui il n'a aucune interface : le rôle existe dans les comptes mais aucun
écran ne lui est destiné, ce qui rend la promesse centrale du produit — la mise en relation —
impossible à honorer côté praticien.

**Why this priority**: sans praticien équipé, aucune consultation ne peut aboutir. C'est le seul
écart qui rend le produit non fonctionnel de bout en bout ; tous les autres dégradent l'expérience
sans la bloquer.

**Independent Test**: créer un compte vétérinaire validé, se déclarer disponible, recevoir une
demande émise par un compte éleveur, l'accepter, échanger, clôturer par un compte rendu, et
constater que le compte rendu apparaît dans le dossier de l'animal côté éleveur.

**Acceptance Scenarios**:

1. **Given** un vétérinaire dont le compte a été validé, **When** il ouvre l'application, **Then** il
   arrive sur un tableau de bord praticien distinct de celui de l'éleveur, affichant son statut de
   disponibilité, sa file d'attente et son planning du jour.
2. **Given** un vétérinaire en statut « En ligne », **When** un éleveur émet une demande de
   consultation, **Then** le vétérinaire est notifié et dispose d'un délai borné pour accepter avant
   que la demande soit réacheminée vers un autre praticien.
3. **Given** une consultation terminée, **When** le vétérinaire clôture la session, **Then** il doit
   renseigner un compte rendu structuré (diagnostic, traitement, suivi, médicaments, posologie) avant
   de pouvoir quitter l'écran, et ce compte rendu est attaché au dossier médical de l'animal.
4. **Given** un vétérinaire ayant réalisé des consultations facturées, **When** il ouvre sa section
   financière, **Then** il voit ses revenus par période, le détail des commissions retenues et peut
   demander un retrait de ses gains.

---

### User Story 2 - L'éleveur trouve un vétérinaire autour de lui (Priority: P1)

Un éleveur en zone rurale veut savoir quels praticiens interviennent près de chez lui, lesquels sont
disponibles maintenant, à quel tarif, et comment les joindre. Aujourd'hui l'annuaire existe mais
n'est ni géolocalisé ni cartographié : l'éleveur ne peut pas raisonner en distance, ce qui est
pourtant le critère déterminant lorsqu'un déplacement physique s'impose.

**Why this priority**: la proximité est le premier critère de choix en milieu rural et conditionne
la faisabilité même d'une intervention à domicile.

**Independent Test**: se positionner à des coordonnées données, ouvrir l'annuaire, vérifier que les
praticiens sont classés et filtrables par distance, et qu'un itinéraire peut être calculé vers l'un
d'eux.

**Acceptance Scenarios**:

1. **Given** un éleveur ayant autorisé la localisation, **When** il ouvre l'annuaire, **Then** une
   carte affiche les vétérinaires environnants avec leur distance et leur disponibilité en temps réel.
2. **Given** la liste des praticiens, **When** l'éleveur applique des filtres (espèce traitée,
   distance maximale, disponibilité immédiate, tarif, note, langue parlée), **Then** seuls les
   praticiens correspondants restent affichés.
3. **Given** un éleveur sans connexion, **When** il ouvre l'annuaire, **Then** il retrouve au moins
   les praticiens qu'il a consultés récemment, avec leurs coordonnées.
4. **Given** une consultation d'urgence acceptée avec déplacement, **When** l'intervention est en
   cours, **Then** l'éleveur peut partager sa position en temps réel avec le praticien, et ce partage
   cesse à la clôture de l'intervention.

---

### User Story 3 - L'éleveur consulte à distance en voix et en image (Priority: P1)

Un éleveur constate une lésion qu'il ne sait pas décrire. Il veut montrer l'animal au praticien et
lui parler. Aujourd'hui seul l'échange écrit avec photos existe : la SFD prévoit l'appel audio et la
consultation vidéo, qui sont aussi les seuls canaux réellement praticables pour un utilisateur peu à
l'aise avec l'écrit.

**Why this priority**: l'accessibilité aux utilisateurs faiblement alphabétisés est un objectif
produit explicite, et l'examen visuel à distance conditionne la qualité du tri.

**Independent Test**: établir un appel audio puis un appel vidéo entre un compte éleveur et un compte
vétérinaire, et vérifier la qualité de la liaison ainsi que la facturation à la durée.

**Acceptance Scenarios**:

1. **Given** un vétérinaire disponible, **When** l'éleveur choisit une consultation audio ou vidéo,
   **Then** la liaison s'établit et les deux parties s'entendent et se voient sans coupure perceptible.
2. **Given** un appel en cours, **When** la qualité du réseau se dégrade, **Then** l'application
   bascule automatiquement vers un mode dégradé (audio seul) plutôt que d'interrompre la session.
3. **Given** un appel terminé, **When** la session se clôt, **Then** la durée facturable est calculée
   et présentée à l'éleveur avant tout prélèvement.

---

### User Story 4 - Le dossier médical de l'animal est complet et transmissible (Priority: P2)

Un éleveur veut prouver l'état sanitaire de ses bêtes — pour vendre, pour accéder au crédit
agricole, pour une démarche administrative. Il lui faut un dossier complet et exportable. Aujourd'hui
le dossier existe mais ne couvre ni le suivi pondéral, ni le suivi reproductif, ni l'export, ni
l'identification par code visuel, ni le partage vers un tiers.

**Why this priority**: c'est le levier de valeur économique du produit au-delà du soin — la
traçabilité qui ouvre les marchés — mais elle suppose que les consultations fonctionnent d'abord.

**Independent Test**: enregistrer un animal, y consigner vaccinations, pesées et événements de
reproduction, puis produire un export lisible et un lien de partage à durée limitée.

**Acceptance Scenarios**:

1. **Given** un animal enregistré, **When** l'éleveur ouvre son dossier, **Then** il y trouve
   l'historique des consultations, le carnet de vaccination avec échéances, la courbe de poids, le
   suivi reproductif, les traitements en cours et les documents attachés.
2. **Given** un dossier renseigné, **When** l'éleveur demande un export, **Then** il obtient un
   document présentable à un tiers, portant sur le dossier complet ou sur une période choisie.
3. **Given** un animal identifié, **When** l'éleveur affiche son code d'identification, **Then** ce
   code permet à un praticien de retrouver l'animal sans saisie manuelle.
4. **Given** un partage vers un praticien ou une institution, **When** le délai de validité est
   dépassé, **Then** le lien cesse de donner accès au dossier.
5. **Given** un animal vendu ou cédé, **When** le transfert est enregistré, **Then** l'historique
   sanitaire suit l'animal et reste consultable par le nouveau détenteur.

---

### User Story 5 - L'application reste utilisable sans réseau (Priority: P2)

Un éleveur en zone blanche doit pouvoir consulter son cheptel, enregistrer une observation, préparer
un message et interroger l'assistant. Aujourd'hui seules trois actions sont mises en file d'attente
et aucune donnée n'est répliquée localement : hors réseau, l'application est largement inerte, ce qui
contredit frontalement le principe « offline-first » de la SFD.

**Why this priority**: la connectivité intermittente est la réalité de terrain ; sans ce socle, une
partie des utilisateurs cibles ne peut pas se servir du produit du tout.

**Independent Test**: couper le réseau, exercer l'ensemble des fonctions déclarées disponibles hors
ligne, rétablir le réseau et vérifier que tout se synchronise sans perte ni doublon.

**Acceptance Scenarios**:

1. **Given** un appareil sans connexion, **When** l'éleveur ouvre l'application, **Then** il accède à
   son cheptel et aux dossiers médicaux de tous ses animaux.
2. **Given** un appareil sans connexion, **When** l'éleveur décrit des symptômes à l'assistant,
   **Then** il obtient une orientation fondée sur une base locale, avec mention explicite du mode
   dégradé.
3. **Given** des actions réalisées hors ligne, **When** la connexion revient, **Then** la
   synchronisation démarre seule, sa progression est visible, et l'utilisateur est informé de son
   issue.
4. **Given** une même donnée médicale modifiée hors ligne des deux côtés, **When** la synchronisation
   détecte le conflit, **Then** la donnée n'est pas écrasée silencieusement et le conflit est soumis
   à arbitrage humain.
5. **Given** une synchronisation interrompue en cours de route, **When** elle reprend, **Then** aucune
   action n'est appliquée deux fois.

---

### User Story 6 - L'éleveur non-lecteur se sert de l'application (Priority: P2)

Un éleveur qui lit peu doit pouvoir décrire les symptômes de son animal. La SFD prévoit la saisie
vocale, la restitution orale et la sélection de symptômes par pictogrammes ; aucune des trois n'est
disponible aujourd'hui, alors que le profil utilisateur cible est explicitement décrit comme
faiblement alphabétisé.

**Why this priority**: sans cela, une fraction importante du public visé est exclue de la
fonctionnalité qui constitue le cœur différenciateur du produit.

**Independent Test**: réaliser un parcours complet de pré-analyse sans lire ni saisir un seul mot, en
n'utilisant que la voix et les pictogrammes.

**Acceptance Scenarios**:

1. **Given** l'écran d'assistant, **When** l'éleveur dicte les symptômes dans sa langue, **Then** la
   description est transcrite et prise en compte dans l'analyse.
2. **Given** une orientation produite, **When** l'éleveur active la restitution orale, **Then** le
   résultat et les recommandations lui sont lus dans sa langue.
3. **Given** l'écran de saisie des symptômes, **When** l'éleveur ne saisit rien, **Then** il peut
   sélectionner les symptômes au moyen de pictogrammes explicites.
4. **Given** n'importe quel écran de l'application, **When** un élément interactif est mesuré,
   **Then** sa cible tactile et son contraste satisfont les seuils d'accessibilité retenus.

---

### User Story 7 - L'éleveur est alerté avant que la situation ne dégénère (Priority: P3)

Un éleveur veut être prévenu : une vaccination arrive à échéance, une maladie circule dans sa zone,
les conditions climatiques favorisent une épizootie. Le tableau de bord actuel n'affiche ni bandeau
d'alerte régionale ni indicateur météo, et l'accès à l'urgence n'est pas permanent.

**Why this priority**: forte valeur préventive, mais l'utilité dépend d'un socle de données
sanitaires déjà alimenté par les usages précédents.

**Independent Test**: déclencher chacune des conditions d'alerte et vérifier que la notification
part sur les canaux prévus et qu'elle est désactivable individuellement.

**Acceptance Scenarios**:

1. **Given** une vaccination arrivant à échéance, **When** le seuil de rappel est atteint, **Then**
   l'éleveur est notifié sur les canaux configurés.
2. **Given** un foyer signalé dans la zone de l'éleveur, **When** l'alerte est diffusée, **Then**
   elle apparaît de façon distinctive sur son tableau de bord.
3. **Given** n'importe quel écran, **When** l'éleveur a besoin d'une prise en charge urgente,
   **Then** il peut la déclencher sans avoir à naviguer.
4. **Given** les paramètres de notification, **When** l'éleveur désactive une catégorie, **Then**
   il cesse d'en recevoir sans que les autres catégories soient affectées.

---

### Edge Cases

- Un éleveur déclenche une urgence alors qu'aucun praticien n'est disponible dans sa zone : la
  demande doit être élargie progressivement plutôt que d'échouer en silence, et l'éleveur doit être
  tenu informé de l'élargissement.
- Un vétérinaire perd le réseau pendant une consultation facturée à la durée : le décompte doit
  s'arrêter, la session doit pouvoir reprendre, et l'éleveur ne doit pas être facturé du temps
  d'interruption.
- Un paiement est débité côté opérateur mais la confirmation n'atteint jamais l'application : la
  transaction doit être réconciliée et ne jamais être présentée comme un échec définitif sans
  vérification.
- Un compte est supprimé alors que des dossiers médicaux d'animaux y sont rattachés : les obligations
  de conservation sanitaire doivent primer sur l'effacement, par anonymisation plutôt que suppression.
- Un animal est transféré à un éleveur qui n'utilise pas encore l'application.
- Un appareil bas de gamme atteint sa limite de stockage alors que la réplication locale est activée :
  l'application doit dégrader la réplication plutôt que devenir inutilisable.
- Deux vétérinaires acceptent la même demande d'urgence au même instant.
- Un utilisateur change de langue au milieu d'un parcours de consultation.
- Un fuseau horaire ou une heure d'appareil incorrecte fausse les rappels de rendez-vous.

---

## Requirements *(mandatory)*

### Functional Requirements — Interface vétérinaire

- **FR-001**: Le système MUST présenter aux utilisateurs de rôle vétérinaire un espace distinct de
  l'espace éleveur dès la connexion, sans que le praticien ait à changer de mode manuellement.
- **FR-002**: Le vétérinaire MUST pouvoir basculer son statut de disponibilité entre « disponible »,
  « occupé » et « indisponible » en une seule action, et ce statut MUST être reflété auprès des
  éleveurs en temps réel.
- **FR-003**: Le système MUST présenter au vétérinaire sa file d'attente de consultations et son
  planning du jour, chaque entrée portant l'éleveur, l'animal concerné et le motif.
- **FR-004**: Le système MUST présenter au vétérinaire ses indicateurs d'activité sur la période
  courante : volume de consultations, taux de réponse, note moyenne et revenus.
- **FR-005**: Le système MUST exiger un compte rendu structuré avant la clôture de toute consultation,
  et MUST rattacher ce compte rendu au dossier médical de l'animal concerné.
- **FR-006**: Le vétérinaire MUST pouvoir déclarer ses créneaux de disponibilité, proposer un report,
  et définir ses frais d'annulation tardive dans les bornes prévues.
- **FR-007**: Le système MUST permettre au vétérinaire de consulter le détail de ses revenus par
  période et de demander le versement de ses gains.

### Functional Requirements — Consultation à distance

- **FR-008**: Le système MUST proposer à l'éleveur les modalités de consultation prévues : échange
  écrit, appel audio, consultation vidéo, prise en charge urgente et rapport différé.
- **FR-009**: Le système MUST acheminer une demande vers le praticien habituel de l'éleveur en
  priorité, puis vers les praticiens disponibles de la zone, puis au-delà.
- **FR-010**: Le système MUST réacheminer automatiquement une demande non acceptée dans le délai
  imparti, et MUST garantir qu'une demande ne peut être prise en charge que par un seul praticien.
- **FR-011**: Le système MUST diffuser une demande urgente à plusieurs praticiens proches simultanément
  et MUST informer l'éleveur de l'état de la recherche.
- **FR-012**: Le système MUST interrompre le décompte facturable lorsque la liaison est perdue et
  MUST permettre la reprise de la session.
- **FR-013**: Le système MUST dégrader la modalité vidéo vers l'audio lorsque les conditions réseau
  l'imposent, plutôt que d'interrompre la consultation.

### Functional Requirements — Géolocalisation et annuaire

- **FR-014**: Le système MUST présenter les praticiens sur une représentation cartographique centrée
  sur la position de l'éleveur, et MUST fonctionner de façon dégradée si la localisation est refusée.
- **FR-015**: Le système MUST permettre de filtrer les praticiens par espèce traitée, distance,
  disponibilité immédiate, tarif, note et langue parlée.
- **FR-016**: Le système MUST permettre le calcul d'un itinéraire vers le lieu d'exercice du praticien.
- **FR-017**: Le système MUST permettre à l'éleveur de partager sa position en temps réel pendant une
  intervention urgente à domicile, et MUST cesser ce partage à la clôture de l'intervention.
- **FR-018**: Le système MUST rendre consultables hors connexion les praticiens récemment contactés.

### Functional Requirements — Dossier médical animal

- **FR-019**: Le système MUST doter chaque animal d'un identifiant unique et d'une représentation
  visuelle de cet identifiant permettant de le retrouver sans saisie.
- **FR-020**: Le système MUST consigner, pour chaque animal, le carnet de vaccination avec échéances,
  le suivi pondéral, le suivi reproductif, les traitements en cours et les documents attachés.
- **FR-021**: Le système MUST permettre l'export du dossier médical, en totalité ou sur une période
  choisie, sous une forme présentable à un tiers.
- **FR-022**: Le système MUST permettre le partage d'un dossier avec un praticien ou une institution
  au moyen d'un accès à durée de validité limitée, révocable.
- **FR-023**: Le système MUST permettre le transfert d'un animal à un autre détenteur en conservant
  l'intégralité de son historique sanitaire.
- **FR-024**: Le système MUST journaliser tout accès et toute modification portant sur un dossier
  médical, en identifiant l'auteur et l'instant.

### Functional Requirements — Fonctionnement hors ligne

- **FR-025**: Le système MUST rendre consultables hors connexion le cheptel et les dossiers médicaux
  de tous les animaux du détenteur.
- **FR-026**: Le système MUST permettre hors connexion la création et la modification de fiches
  animaux, la saisie d'observations sanitaires et la rédaction de messages.
- **FR-027**: Le système MUST fournir hors connexion une orientation issue d'une base locale de
  pathologies, en signalant explicitement qu'il s'agit d'un mode dégradé.
- **FR-028**: Le système MUST synchroniser automatiquement dès le retour de la connectivité et MUST
  rendre visible l'état d'avancement ainsi que l'issue de la synchronisation.
- **FR-029**: Le système MUST garantir qu'une action synchronisée n'est jamais appliquée plus d'une
  fois, y compris après interruption et reprise.
- **FR-030**: Le système MUST soumettre à arbitrage humain tout conflit portant sur une donnée
  médicale, et NE DOIT PAS résoudre ces conflits par écrasement automatique.
- **FR-031**: Le système MUST conserver un journal de synchronisation consultable à des fins de
  diagnostic.

### Functional Requirements — Accessibilité et langues

- **FR-032**: Le système MUST permettre de décrire des symptômes par la voix et MUST restituer
  oralement l'orientation produite.
- **FR-033**: Le système MUST permettre la sélection des symptômes au moyen de pictogrammes, sans
  recours à la lecture.
- **FR-034**: Le système MUST permettre l'ajustement de la taille du texte et proposer un mode de
  contraste renforcé adapté à un usage en plein soleil.
- **FR-035**: Le système MUST respecter, pour tout élément interactif, les seuils de taille de cible
  tactile et de contraste retenus comme référence d'accessibilité.
- **FR-036**: Le système MUST permettre le changement de langue à tout moment, sans interruption de
  session ni perte du parcours en cours.
- **FR-037**: Le système MUST proposer un tutoriel de premier lancement dans la langue choisie.

### Functional Requirements — Alertes et tableau de bord

- **FR-038**: Le système MUST rendre l'accès à une prise en charge urgente possible depuis tout écran
  de l'espace éleveur.
- **FR-039**: Le système MUST afficher à l'éleveur les alertes sanitaires concernant sa zone
  géographique.
- **FR-040**: Le système MUST signaler à l'éleveur les conditions climatiques locales propices aux
  épizooties.
- **FR-041**: Le système MUST notifier chacun des événements prévus au tableau des alertes, sur les
  canaux prévus pour chacun.
- **FR-042**: L'utilisateur MUST pouvoir désactiver chaque catégorie de notification indépendamment
  des autres.

### Functional Requirements — Sécurité et conformité

- **FR-043**: Le système MUST protéger le contenu des échanges et des consultations de sorte qu'il ne
  soit lisible que par l'éleveur et le praticien concernés.
- **FR-044**: Le système MUST chiffrer les données médicales au repos et les données sensibles
  stockées sur l'appareil.
- **FR-045**: Le système MUST limiter le débit des requêtes par origine et par compte authentifié afin
  de résister aux usages abusifs.
- **FR-046**: Le système MUST bloquer temporairement un compte après un nombre borné de tentatives
  d'authentification infructueuses.
- **FR-047**: Le système MUST permettre la suppression d'un compte par anonymisation, en préservant
  les obligations de conservation des données sanitaires.
- **FR-048**: Le système MUST permettre à l'utilisateur d'obtenir une copie de ses données
  personnelles.
- **FR-049**: Le système MUST conserver les données de santé animale pour la durée prévue, puis les
  archiver de façon sécurisée.
- **FR-050**: Le système MUST permettre le signalement d'un message inapproprié et son traitement par
  la modération.

### Functional Requirements — Conformité au design de référence

- **FR-051**: Chaque écran de l'application MUST correspondre à sa maquette de référence en
  composition, hiérarchie visuelle et libellés.
- **FR-052**: Les valeurs de style partagées — couleurs, typographies, espacements, rayons, élévations
  — MUST être définies en un point unique et référencées par les écrans, sans valeur codée en dur.
- **FR-053**: Tout écart délibéré par rapport à la maquette MUST être documenté avec sa justification.
- **FR-054**: Les états d'un écran — chargement, vide, erreur, hors ligne — MUST être traités, y
  compris lorsque la maquette ne les représente pas.

### Functional Requirements — Réconciliation du périmètre

- **FR-055**: Le module de vente de produits présent dans l'application et absent de la spécification
  de référence MUST être soit intégré à la spécification, soit retiré du produit, sans rester dans un
  état intermédiaire non spécifié.

### Key Entities

- **Utilisateur**: personne physique identifiée par son numéro de téléphone, portant un rôle (éleveur,
  vétérinaire, administrateur), une langue de préférence et une zone géographique.
- **Profil vétérinaire**: qualification d'un utilisateur praticien — numéro d'ordre, pièces
  justificatives, spécialités, zone d'intervention, tarifs, modes d'intervention, statut de validation
  et statut de disponibilité.
- **Exploitation**: unité de détention rattachée à un éleveur, regroupant des animaux.
- **Animal**: sujet du dossier médical, identifié de façon unique, rattaché à une exploitation,
  transférable entre détenteurs en conservant son historique.
- **Dossier médical animal**: agrégat de l'historique sanitaire d'un animal — consultations,
  vaccinations, pesées, événements de reproduction, traitements, documents, signalements.
- **Consultation**: mise en relation entre un éleveur et un praticien portant sur un animal, d'une
  modalité donnée, produisant un compte rendu et une facturation.
- **Compte rendu de consultation**: acte médical rédigé par le praticien — diagnostic, traitement
  prescrit, posologie, suivi recommandé.
- **Rendez-vous**: créneau réservé auprès d'un praticien, susceptible d'être confirmé, rappelé,
  reporté ou annulé selon des règles de délai.
- **Transaction**: mouvement financier lié à une consultation, portant un moyen de paiement, un
  montant, une commission et un état.
- **Alerte sanitaire**: signalement rattaché à une zone géographique et diffusé aux détenteurs
  concernés.
- **Action différée**: intention utilisateur enregistrée hors connexion, en attente d'application,
  porteuse d'une identité stable garantissant son unicité à la synchronisation.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes — Expérience

- **SC-001**: Un éleveur obtient une orientation sur l'état de son animal en moins de 5 minutes à
  compter de l'ouverture de l'application.
- **SC-002**: Un éleveur non-lecteur mène un parcours de pré-analyse complet sans lire ni saisir de
  texte, avec un taux de réussite d'au moins 80 % lors des tests d'usage encadrés.
- **SC-003**: Une demande de consultation urgente trouve un praticien en moins de 10 minutes dans
  90 % des cas, aux heures d'activité.
- **SC-004**: Une demande de consultation ordinaire reçoit une réponse en moins de 2 heures dans 90 %
  des cas.
- **SC-005**: 100 % des consultations clôturées produisent un compte rendu rattaché au dossier de
  l'animal concerné.
- **SC-006**: Un éleveur produit un justificatif sanitaire présentable à un tiers en moins de
  2 minutes.

### Measurable Outcomes — Fonctionnement hors ligne

- **SC-007**: L'intégralité des fonctions déclarées disponibles hors ligne le sont effectivement,
  réseau coupé, sans message d'erreur technique.
- **SC-008**: Après 48 heures d'usage hors connexion, la synchronisation aboutit sans perte de donnée
  ni doublon.
- **SC-009**: 100 % des conflits portant sur une donnée médicale sont soumis à arbitrage et aucun
  n'est résolu par écrasement silencieux.
- **SC-010**: L'empreinte de stockage locale reste sous 100 Mo pour un cheptel de 200 animaux
  disposant chacun d'un historique sanitaire.

### Measurable Outcomes — Performance

- **SC-011**: L'écran d'accueil devient utilisable en moins de 2 secondes sur une liaison mobile
  lente, sur un appareil d'entrée de gamme représentatif du parc cible.
- **SC-012**: L'orientation de l'assistant est restituée en moins de 3 secondes en mode connecté.
- **SC-013**: Une conversation audio ou vidéo est perçue comme fluide, sans écho ni décalage
  gênant, sur une liaison mobile de qualité moyenne.
- **SC-014**: L'application démarre à froid en moins de 4 secondes sur l'appareil de référence.
- **SC-015**: La taille de l'application livrée reste sous le seuil retenu pour les appareils
  d'entrée de gamme.

### Measurable Outcomes — Montée en charge et disponibilité

- **SC-016**: Le service soutient 1 000 utilisateurs actifs simultanés sans dégradation perceptible
  des temps de réponse.
- **SC-017**: Le service soutient 50 consultations audio ou vidéo simultanées sans dégradation de la
  qualité de liaison.
- **SC-018**: Le service atteint la cible de montée en charge de la phase suivante — 50 000
  utilisateurs actifs simultanés — sans réécriture de son architecture.
- **SC-019**: Le service reste disponible 99,5 % du temps hors fenêtres de maintenance annoncées.
- **SC-020**: Une interruption d'un composant tiers — paiement, messagerie, cartographie — ne rend pas
  l'application inutilisable dans ses autres fonctions.

### Measurable Outcomes — Sécurité

- **SC-021**: Aucune vulnérabilité de gravité élevée ou critique n'est ouverte à la mise en
  production, à l'issue d'une revue de sécurité indépendante.
- **SC-022**: Aucune donnée médicale n'est lisible par l'exploitant du service sans le concours de
  l'utilisateur concerné.
- **SC-023**: 100 % des accès et modifications portant sur un dossier médical sont journalisés et
  imputables à un auteur identifié.
- **SC-024**: Aucun secret ni jeton d'authentification n'est extractible de l'application livrée ni
  du stockage de l'appareil.
- **SC-025**: Une demande d'effacement de compte est honorée dans le délai réglementaire applicable,
  sans compromettre les obligations de conservation sanitaire.

### Measurable Outcomes — Conformité au design

- **SC-026**: 100 % des écrans livrés sont validés comme conformes à leur maquette de référence, ou
  portent un écart documenté et accepté.
- **SC-027**: Aucune valeur de style n'est codée en dur dans un écran ; toutes proviennent du
  référentiel de style partagé.

---

## Assumptions

- La stack mobile retenue est celle déjà en production ; aucune réécriture technologique n'est
  envisagée dans le cadre de cette feature — arbitrage explicite de l'auteur du produit.
- Le back-end existant couvre déjà une part notable des besoins ; les écarts sont traités par
  extension plutôt que par remplacement.
- Les langues de la phase courante restent celles déjà implémentées ; l'ajout du swahili et de
  l'arabe, prévu par la spécification de référence, relève d'une phase ultérieure et suppose la prise
  en charge de l'écriture de droite à gauche.
- Les tests de terrain se tiennent auprès d'éleveurs pilotes des zones déjà identifiées, sur des
  appareils représentatifs du parc réel plutôt que sur émulateur.
- Les seuils de performance s'entendent sur un appareil d'entrée de gamme et une liaison mobile
  dégradée, conditions représentatives de l'usage cible, et non sur un appareil de développement.
- La validation des praticiens reste un acte humain assuré par l'équipe d'administration.
- Le module de vente de produits est considéré comme faisant partie du produit jusqu'à décision
  contraire, et sa réconciliation avec la spécification de référence est traitée comme une exigence à
  part entière.

---

## Dependencies

- Accès en lecture au fichier de maquettes de référence pour l'équipe et pour l'outillage de
  vérification. **À ce jour cet accès n'est pas acquis** : le fichier n'est pas ouvert au compte
  utilisé, ce qui bloque toute vérification automatisée de la conformité visuelle et rend les
  exigences FR-051 à FR-054 non vérifiables en l'état.
- Fourniture d'un service de communication en temps réel couvrant la zone géographique visée, pour
  les modalités audio et vidéo.
- Fourniture d'un service de transcription et de restitution vocale couvrant les langues de la phase
  courante, en particulier le fulfulde dont la couverture par les services courants est incertaine.
- Disponibilité d'un jeu de données sanitaires régionales alimentant les alertes de zone.
- Habilitation d'un intervenant externe pour la revue de sécurité indépendante.
- Existence d'un environnement de recette dimensionné pour les essais de montée en charge, distinct
  de la production.

---

## Out of Scope

- Le portage sur iOS, prévu par la spécification de référence pour une phase ultérieure.
- L'ajout du swahili, de l'arabe et du haoussa, ainsi que la prise en charge de l'écriture de droite
  à gauche.
- Le paiement par carte bancaire, prévu en phase ultérieure.
- Le portail des institutions partenaires et les exports épidémiologiques associés, qui relèvent du
  back-office et non de l'application mobile.
- La refonte du back-office d'administration, hors extensions rendues nécessaires par les exigences
  ci-dessus.

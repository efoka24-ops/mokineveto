# MokineVeto Constitution

Ce document énonce les principes qui gouvernent le développement de MokineVeto. Il prime sur les
préférences individuelles et sur les habitudes de code. Toute exception doit être justifiée par
écrit dans la revue qui l'introduit.

Références permanentes : `SFD-MKNV-2026-v1.0.md` (spécification fonctionnelle de référence) et
`SPEC.md` (périmètre historique).

## Core Principles

### I. Le terrain dicte la conception

L'utilisateur de référence est un éleveur rural disposant d'un téléphone d'entrée de gamme, d'une
connexion intermittente et d'une aisance limitée avec l'écrit. Toute décision de conception se
tranche depuis cette contrainte, jamais depuis l'appareil du développeur.

En pratique : aucune fonctionnalité n'est réputée terminée si elle n'a pas été éprouvée sur un
appareil bas de gamme et sur une liaison dégradée. Un parcours qui suppose la lecture doit offrir une
alternative visuelle ou vocale. Un écran qui suppose le réseau doit énoncer ce qu'il advient sans lui.

### II. Hors ligne par défaut, pas en rattrapage

L'absence de réseau est l'état nominal, non l'exception. Une fonctionnalité se conçoit d'abord dans
son comportement hors connexion, la synchronisation venant ensuite.

En pratique : toute écriture utilisateur est enregistrée localement avant toute tentative
d'émission ; toute action différée porte une identité stable qui garantit son unicité à la reprise ;
aucun conflit portant sur une donnée médicale n'est résolu par écrasement automatique. Un
indicateur de synchronisation est visible dès qu'une donnée est en attente.

### III. La donnée médicale se traite comme une donnée sensible

Le dossier médical animal engage la valeur économique du cheptel et l'accès au marché de l'éleveur.
Il se protège en conséquence, sans considérer qu'il s'agit « seulement » d'animaux.

En pratique : chiffrement en transit et au repos ; contenu des échanges lisible des seules parties
concernées ; journalisation de tout accès et de toute modification avec auteur et instant ;
suppression de compte par anonymisation, jamais par effacement d'un historique sanitaire soumis à
conservation. Aucun secret n'est embarqué dans l'application livrée.

### IV. L'orientation n'est pas un diagnostic

L'assistant de pré-analyse oriente ; il ne diagnostique pas. La responsabilité médicale appartient au
vétérinaire certifié.

En pratique : toute sortie de l'assistant porte une mention explicite de son statut d'orientation ;
aucune posologie n'est proposée sans validation d'un praticien ; le mode dégradé hors ligne est
signalé comme tel ; une orientation de niveau d'urgence élevé propose systématiquement une mise en
relation.

### V. Une seule source de vérité par sujet

Une valeur qui gouverne le produit — un style, un tarif, une règle métier, un libellé — est définie
en un point unique et référencée partout ailleurs.

En pratique : aucune valeur de style codée en dur dans un écran, toutes proviennent du référentiel de
style ; aucun libellé en dur, tous proviennent des fichiers de traduction ; les règles de facturation
et de commission sont portées par le serveur, jamais recalculées par le client. Lorsque deux
documents de spécification divergent, la divergence est tranchée et consignée, jamais contournée.

### VI. Vérifier plutôt que déclarer

Une exigence chiffrée sans dispositif de mesure est une intention, pas une exigence.

En pratique : chaque seuil de performance, de montée en charge ou de sécurité énoncé dans la SFD est
adossé à un test qui le mesure ; un critère qu'aucun test ne couvre est signalé comme non vérifié
plutôt que présenté comme atteint ; les résultats sont rapportés tels quels, échecs compris.

## Contraintes techniques et de sécurité

**Stack arbitrée.** Le mobile est développé en Expo / React Native, TypeScript. Cet arbitrage a été
rendu explicitement le 2026-08-21 contre la recommandation initiale de la SFD §6, qui prescrivait
Flutter ; la SFD a été corrigée en conséquence. Aucune réécriture technologique du mobile n'est
recevable sans un nouvel arbitrage du propriétaire du produit.

**Seuils opposables** (SFD §5, mesurés sur appareil d'entrée de gamme et liaison mobile dégradée,
jamais sur appareil de développement) : accueil utilisable sous 2 s ; orientation de l'assistant
restituée sous 3 s en mode connecté ; liaison audio/vidéo sous 500 ms de latence ; empreinte de
stockage locale sous 100 Mo ; disponibilité du service à 99,5 % hors maintenance annoncée ;
1 000 utilisateurs actifs simultanés en phase courante, 50 000 en phase suivante sans réécriture
d'architecture.

**Accessibilité opposable** (SFD §8.2) : cible tactile d'au moins 48 × 48 dp et contraste texte/fond
d'au moins 4,5:1 sur tout élément interactif. Un écran qui ne satisfait pas ces seuils n'est pas
livrable.

**Sécurité opposable** (SFD §7) : TLS 1.3 en transit ; chiffrement au repos des données médicales ;
chiffrement de bout en bout des échanges et des appels ; stockage local chiffré ; requêtes
paramétrées exclusivement ; limitation de débit par origine et par compte ; validation de toute
entrée côté serveur ; obfuscation du code livré ; revue de sécurité indépendante avant mise en
production et à intervalle semestriel.

**Conformité opposable** : loi camerounaise n° 2010/012 du 21 décembre 2010 ; RGPD sur les marchés
concernés ; hébergement des données africaines sur des infrastructures localisées en Afrique.

## Processus de développement

**Ordre des travaux.** Spécification, puis plan, puis tâches, puis implémentation. Une
implémentation qui devance sa spécification est refusée en revue.

**Divergences entre références.** Lorsque le code et la SFD divergent, la divergence est portée à
l'arbitrage du propriétaire du produit avant tout travail. Elle n'est jamais tranchée
unilatéralement par le développeur, dans un sens ni dans l'autre, et l'arbitrage rendu est consigné
dans la SFD.

**Portes de qualité avant livraison.** Aucune livraison sans : suite de régression automatisée au
vert ; parcours hors ligne éprouvés réseau coupé ; seuils d'accessibilité vérifiés sur les écrans
touchés ; absence de vulnérabilité de gravité élevée ou critique ouverte ; rendu vérifié sur appareil
ou émulateur.

**Conformité au design.** Un écran se compare à sa maquette de référence avant d'être déclaré
terminé. Un écart délibéré est documenté avec sa justification ; un écart non documenté est un
défaut. Les états non maquettés — chargement, vide, erreur, hors ligne — relèvent néanmoins de la
responsabilité de l'implémenteur.

**Documentation vivante.** La SFD est mise à jour au rythme des arbitrages rendus. Un arbitrage non
consigné est réputé non rendu.

## Governance

Cette constitution prime sur toute autre pratique du projet. Les revues vérifient sa bonne
application ; toute complexité introduite doit être justifiée au regard de ses principes.

Un amendement requiert : la formulation écrite du changement, sa justification, l'accord du
propriétaire du produit, et le cas échéant un plan de migration du code existant. La version est
incrémentée en majeur lorsqu'un principe est retiré ou redéfini, en mineur lorsqu'un principe ou une
section est ajouté, en correctif pour toute clarification sans effet normatif.

**Version**: 1.0.0 | **Ratified**: 2026-08-21 | **Last Amended**: 2026-08-21

# MokineVeto — Périmètre fonctionnel (source de vérité)

> Première application mobile de **télémédecine vétérinaire** au Cameroun, dédiée aux
> animaux d'élevage et aux vétérinaires ruraux. Intègre un **assistant virtuel (chatbot)**
> de pré-analyse des pathologies et la mise en relation à distance éleveur ↔ vétérinaire.

## Caractéristiques clés
- **Public** : éleveurs (monde agricole) + professionnels de la santé animale en milieu rural.
- **Pré-analyse IA** : chatbot interactif qui recueille les symptômes, suggère des pathologies
  probables et des mesures de prévention **avant** l'avis du vétérinaire (orientation, pas diagnostic).
- **Téléconsultation** : tri pour déterminer si une visite sur place est nécessaire.
- **Base de connaissances** : +100 fiches techniques pathologiques (description, observations
  terrain, prévention, infos vétérinaire), consultables **hors-ligne**, alimentant le chatbot.

## Rôles / profils
Éleveur · Vétérinaire · Autorité sanitaire · Administrateur (back-office).

## Modules
1. **Compte & accès** — inscription distincte Éleveur/Vétérinaire (vérif. Ordre des vétos pour praticiens) ;
   auth téléphone + **OTP SMS ou e-mail**, **PIN**, **biométrie** ; multi-rôles / multi-exploitations ;
   multilingue **fr / fulfulde / en** ; **mode hors-ligne** + sync auto.
2. **Gestion du cheptel** (Éleveur) — enregistrement animal (espèce, race, sexe, âge, robe, photo) ;
   fiche individuelle, lots/troupeaux ; **carnet de santé** (vaccins, vermifuges, traitements, antécédents) ;
   reproduction (gestation, mises bas, généalogie) ; poids/croissance ; entrées/sorties.
3. **Télémédecine** (cœur) — annuaire vétos (spécialité/proximité/dispo/note) ; RDV programmé ou
   téléconsultation **à la demande (urgence)** ; messagerie + **appel audio/vidéo** ; envoi photos/vidéos ;
   formulaire guidé de symptômes ; **transmission de la pré-analyse chatbot** ; accès véto au carnet de santé ;
   **diagnostic + ordonnance électronique** rattachés à la fiche animal ; points de vente médicaments ;
   compte-rendu archivé + suivi post-consultation ; **paiement Mobile Money** ;
   côté véto : agenda, file d'attente, patients, historique des actes.
4. **Alertes & notifications** — alerte sanitaire auto (anomalie) ; alerte épidémie régionale ;
   rappels (vaccins, vermifuges, traitements, RDV) ; double canal **push + SMS/e-mail**.
5. **Assistant virtuel & aide à la décision** (Éleveur) — chatbot pré-analyse ; questionnaire
   symptomatique adaptatif ; analyse symptômes + photos/vidéos ; pré-diagnostic d'orientation ;
   niveau d'urgence/tri ; **orientation, pas diagnostic** ; détection précoce ; score de risque
   par animal/troupeau ; recommandations préventives ; priorisation des animaux à téléconsulter.
6. **Tableaux de bord & rapports** — vue cheptel ; productivité (mortalité, natalité, GMQ) ;
   économiques (pertes évitées, dépenses vétos) ; **export PDF**.
7. **Base épidémiologique & autorités** — remontée anonymisée ; cartographie des foyers ;
   diffusion des alertes officielles + campagnes ; tableau de bord de surveillance régional/national.
8. **Marketplace & approvisionnement** (Éleveur) — commande médicaments/vaccins/intrants ;
   annuaire pharmacies vétos & fournisseurs ; mise en relation fournisseurs locaux.
9. **Paiement & abonnement** — **Orange Money / MTN MoMo** (→ API Camoo) puis carte ;
   **freemium** ; gestion abonnements/facturation/historique ; **reversement auto des honoraires** vétos.
10. **Formation & support** — bibliothèque +100 fiches (hors-ligne) ; tutoriels ; vidéos bonnes pratiques ;
    centre d'aide/FAQ + support (chat + hotline) ; espace communautaire (optionnel).
11. **Administration** (back-office) — validation/habilitation vétos ; gestion users + modération ;
    supervision du modèle de pré-analyse (fiabilité, comparaison pré-analyse vs diagnostic confirmé) ;
    gestion des fiches techniques ; pilotage global.

## Avancement (MVP mobile, suit le Figma "MokineVet2")
Construction UI d'abord, couche `services/` mockée (même signature que la future API REST),
backend (OTP e-mail SMTP `mokineveto@trugroup.cm` + paiement Camoo) câblé ensuite.

Modules du Figma déjà cadrés : Splash, Welcome, Auth, Home (+onboarding/catégories),
Vétérinaires (liste/détail/favoris/filtres), Schedule, Rendez-vous (+Review), Chat, Notifications,
Profil/Paramètres/Aide/Confidentialité, Paiement (méthodes/Visa/Orange/MTN/recap/succès/échec).
À venir (hors Figma actuel) : cheptel, chatbot IA, fiches techniques, hors-ligne, multilingue, marketplace.

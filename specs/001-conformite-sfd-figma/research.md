# Research: décisions techniques et inconnues à lever

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-21

Ce document consigne l'état de l'existant tel qu'il a été constaté, les décisions déjà rendues, et
les inconnues qui doivent être levées avant d'engager les phases correspondantes.

---

## 1. État constaté de l'existant

Relevé effectué sur la branche `mobile` au 2026-08-21. Ces constats fondent le découpage du plan.

### Ce qui existe et fonctionne

| Domaine | État |
|---|---|
| Écrans mobiles | ~70 fichiers d'écrans sous `mobile/src/screens/`, organisés par domaine |
| Modèle de données | 22 modèles Prisma — couvre déjà `VetProfile`, `Availability`, `Appointment`, `HealthEvent`, `HealthReport`, `Payment`, `Conversation`, `Alert` |
| Routes serveur | 13 routeurs — auth, animals, appointments, vets, chat, payments, ai, marketplace, alerts, fiches, farms, notifications, admin, uploads |
| Temps réel | `socket.io` en place côté serveur et client — support existant pour la présence et le statut de disponibilité |
| Assistant | Double moteur : règles locales (`mobile/src/services/chatbot.ts`) + appel distant `/ai/pre-analysis` avec repli automatique sur les règles locales |
| Internationalisation | i18next + expo-localization, trois langues chargées (fr, en, ff), changement de langue persisté |
| Sécurité de base | `helmet`, JWT, `bcryptjs`, `expo-secure-store`, PIN, authentification biométrique (`expo-local-authentication`) |
| Paiement | Écrans Orange Money et MTN MoMo, service `camoo` côté serveur |
| Typage | `tsc --noEmit` passe sans erreur sur `mobile/` |

### Ce qui manque

| Manque | Portée |
|---|---|
| **Tests** | Aucun test dans les quatre paquets. Aucun framework installé. Seul `scratchpad/e2e.spec.ts` existe, hors arborescence de production |
| **Portes de qualité CI** | `.github/workflows/` ne contient que la construction de l'APK et le déploiement de la vitrine. Aucun typage, lint, test ni analyse de sécurité en échec bloquant |
| **Interface vétérinaire** | Le rôle `VETERINAIRE` existe dans `useAuthStore.ts` et l'inscription praticien existe dans `SignupScreen.tsx`, mais **aucun écran praticien** : pas de répertoire `screens/vet/`, aucun aiguillage par rôle dans `RootNavigator.tsx` |
| **Géolocalisation** | Aucune occurrence de carte, de coordonnées ni de calcul de distance dans `mobile/src/` |
| **Audio / vidéo** | Aucune intégration temps réel média. La messagerie est en texte seul |
| **Persistance locale** | Aucune base relationnelle sur l'appareil. `offlineQueue.ts` repose sur AsyncStorage et ne couvre que trois types d'actions (`CREATE_ANIMAL`, `ADD_HEALTH_EVENT`, `UPDATE_ANIMAL`) |
| **Suivi pondéral et reproductif** | Aucune occurrence dans le code mobile |
| **Export et partage de dossier** | Aucune génération de document, aucun code d'identification visuel |
| **Accessibilité non-lecteurs** | Ni dictée, ni restitution orale, ni pictogrammes de symptômes |
| **Météo et alertes de zone** | Aucune intégration sur le tableau de bord éleveur |

---

## 2. Décisions rendues

### D-01 — Stack mobile : Expo / React Native *(tranchée)*

**Décision** : l'application reste en Expo / React Native. **Date** : 2026-08-21. **Décideur** :
propriétaire du produit.

**Contexte** : la SFD §6 prescrivait initialement Flutter 3.x, alors que l'implémentation en
production est en Expo SDK 56 / React Native 0.85, liée à EAS et déjà distribuée.

**Justification** : une réécriture aurait jeté un mobile fonctionnel et déployé, sans bénéfice
fonctionnel. L'écosystème JavaScript est par ailleurs partagé avec le back-end et le back-office.

**Conséquence** : la SFD a été corrigée — §3, §5, §6, §9 et §10. La contrainte « APK < 30 Mo » a été
révisée en « < 40 Mo par ABI », non atteignable en React Native dans sa formulation initiale.

### D-02 — Réutilisation du back-end plutôt que remplacement *(tranchée)*

Le modèle de données couvre déjà l'essentiel des entités de la SFD. Les écarts sont traités par
extension du schéma existant. Aucun besoin identifié ne justifie une refonte.

### D-03 — Phasage des langues *(par défaut documenté, révisable)*

La phase courante reste limitée à fr / en / ff. Le swahili et l'arabe sont reportés ; l'arabe
implique en outre la prise en charge de l'écriture de droite à gauche, qui touche l'ensemble des
écrans et constitue un chantier à part entière.

### D-04 — Ordonnancement chiffrement avant temps réel *(tranchée, technique)*

Le schéma de chiffrement de bout en bout doit être arrêté **avant** l'intégration de la couche audio
et vidéo. L'ordre inverse imposerait de reprendre entièrement cette couche une fois intégrée. C'est
la principale contrainte d'ordonnancement du plan.

---

## 3. Inconnues à lever

### U-01 — Accès au fichier de maquettes ⛔ **BLOQUANT**

**Question** : comment obtenir un accès exploitable aux maquettes de référence ?

**État** : le fichier a été communiqué mais **n'est pas accessible** au compte utilisé. L'outillage
de lecture retourne un refus d'accès : un accès éditeur est exigé, l'accès en lecture ne suffit pas.

**Ce que cela bloque** : la phase 8 dans son intégralité — FR-051 à FR-054, SC-026, SC-027. Aucune
vérification de conformité visuelle, manuelle ou automatisée, n'est possible.

**Options** : (a) ouvrir un accès éditeur au compte utilisé ; (b) fournir un export des écrans de
référence. L'option (a) est préférable — elle permet la vérification continue, là où un export fige
la référence à un instant donné.

**Qui décide** : propriétaire du produit. **Échéance** : avant l'ouverture de la phase 8.

### U-02 — Transcription vocale en fulfulde

**Question** : quel service couvre la transcription et la restitution vocale en fulfulde ?

**Enjeu** : FR-032 et US6 reposent dessus. Le fulfulde est une langue de phase 1 selon la SFD §8.1 et
la couverture des services de transcription courants y est incertaine — c'est une langue à faibles
ressources.

**Repli identifié** : les pictogrammes (FR-033) satisfont à eux seuls l'essentiel de US6 et ne
dépendent d'aucun service tiers. Ils doivent donc être livrés **avant** le volet vocal, afin que
l'accessibilité aux non-lecteurs ne soit pas suspendue à cette inconnue.

**À faire** : évaluer la couverture réelle des services candidats sur du fulfulde enregistré en
conditions de terrain, avant d'engager T094.

### U-03 — Localisation de l'hébergement

**Question** : les données sont-elles hébergées sur une infrastructure localisée en Afrique ?

**Enjeu** : la SFD §7.3 l'impose. L'hébergement actuel — back-end sur Railway, back-office et
vitrine sur Vercel — rend un écart probable, la région de déploiement effective n'ayant pas été
vérifiée.

**À faire** : constater la région réelle de chaque service, puis arbitrer entre migration et
révision de l'exigence (T091).

### U-04 — Empreinte de stockage de la réplication locale

**Question** : la réplication du cheptel et des dossiers tient-elle sous 100 Mo pour un gros cheptel ?

**Enjeu** : SC-010 fixe 100 Mo pour 200 animaux avec historique complet. Ce seuil est incompatible
avec une réplication naïve incluant les médias.

**Piste** : réplication sélective — métadonnées et historique textuel répliqués, médias conservés à
la demande avec purge par ancienneté. À valider par mesure au banc du bloc 0 avant de figer la
stratégie.

### U-05 — Service de communication temps réel

**Question** : quel fournisseur retenir pour l'audio et la vidéo chiffrés ?

**Enjeu** : SC-013 (fluidité perçue) et SC-017 (50 sessions simultanées) en dépendent, ainsi que la
qualité de couverture réelle en Afrique subsaharienne rurale.

**Critères de choix** : qualité en réseau dégradé et capacité de repli automatique vers l'audio ;
compatibilité avec le schéma de chiffrement arrêté en U-06 ; coût à la minute au regard du modèle de
tarification ; couverture des marchés visés.

### U-06 — Schéma de chiffrement de bout en bout

**Question** : quel schéma d'échange de clés, et comment gérer le cas du multi-appareils et de la
perte d'appareil ?

**Enjeu** : la SFD §7.1 exige que les données médicales soient inaccessibles à l'exploitant sans le
concours de l'utilisateur (SC-022). Cette exigence entre en tension avec deux autres besoins de la
SFD : la supervision des consultations par l'administration (§4.14.2) et l'arbitrage humain des
conflits de synchronisation sur données médicales (§4.12.3, FR-030).

**Tension à résoudre explicitement** : un chiffrement de bout en bout strict rend l'arbitrage
serveur des conflits médicaux impossible. Il faut soit restreindre le périmètre du chiffrement de
bout en bout aux seuls échanges interpersonnels — messages et appels — en laissant les dossiers
médicaux chiffrés au repos mais déchiffrables côté serveur pour arbitrage, soit déporter l'arbitrage
sur l'appareil du praticien. **Cette décision conditionne l'architecture des phases 1, 3 et 4** et
doit être arrêtée en T019.

---

## 4. Récapitulatif des points requérant une décision externe

| Réf | Sujet | Décideur | Bloque |
|---|---|---|---|
| U-01 | Accès aux maquettes | Propriétaire du produit | Phase 8 entière |
| U-03 | Localisation de l'hébergement | Propriétaire du produit | T091 |
| U-06 | Périmètre du chiffrement de bout en bout | Architecture + propriétaire | Phases 1, 3, 4 |
| FR-055 | Sort du module de vente de produits | Propriétaire du produit | Phase 9 |

Les inconnues U-02, U-04 et U-05 relèvent de l'évaluation technique et se lèvent par expérimentation,
sans décision externe.

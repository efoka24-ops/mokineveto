# Audit de conformité au design

**Feature**: [spec.md](./spec.md) | **Date**: 2026-08-21
**Source**: `design/` — 161 PNG exportés du fichier Figma « MokineVet2 », déposés par le propriétaire
du produit le 2026-08-21.

Cet export **débloque la phase 8**, jusque-là suspendue à un accès refusé. Il fige toutefois la
référence à la date de l'export : une reprise de l'accès éditeur au fichier reste préférable pour la
vérification continue.

---

## 1. Inventaire

**42 écrans maquettés** (les 161 fichiers comportent des doublons suffixés `-1`, `-2`, … qui sont des
variantes d'états ou des ré-exports du même écran).

Neuf fichiers font 7 097 octets et sont visuellement vides — les trois états `All appointment`
(Upcoming, Complete, Cancelled) et leurs variantes. Ces écrans sont **maquettés mais non exportables
en l'état** : leur contenu n'a pas été rendu. À redemander.

---

## 2. Appariement maquettes ↔ écrans implémentés

### Écrans maquettés ayant une implémentation

| Maquette | Écran implémenté |
|---|---|
| First Screen, skip1–skip3 | `auth/SplashScreen.tsx`, `auth/OnboardingScreen.tsx` |
| Log In 1–6 | `auth/LoginScreen.tsx`, `auth/WelcomeScreen.tsx`, `auth/ResetPasswordScreen.tsx` |
| Set Password, password manager | `auth/ChangePasswordScreen.tsx` |
| Register, Sign Up | `auth/SignupScreen.tsx` |
| Home, Producteur | `home/HomeScreen.tsx` |
| Doctors | `vets/VetListScreen.tsx` |
| Doctor Profile | `vets/VetDetailScreen.tsx` |
| Favorite Doc | `vets/FavoritesScreen.tsx` |
| Schedule | `appointments/ScheduleScreen.tsx` |
| All appointment (3 états) | `appointments/AgendaScreen.tsx` |
| Details | `appointments/AppointmentDetailScreen.tsx` |
| Cancel Appointment | `appointments/CancelAppointmentScreen.tsx` |
| Review, Review summary | `appointments/ReviewScreen.tsx` |
| Message | `chat/MessagesScreen.tsx`, `chat/ChatScreen.tsx` |
| Notification | `chat/NotificationsScreen.tsx` |
| notification setting | `profile/NotificationSettingsScreen.tsx` |
| Payment Method | `payment/PaymentMethodsScreen.tsx` |
| Payment Successfully, Payment failled | `payment/PaymentResultScreen.tsx` |
| Profile, Logout | `profile/ProfileScreen.tsx` |
| Edit Profile | `profile/EditProfileScreen.tsx` |
| Settings | `profile/SettingsScreen.tsx` |
| Privacy Policy | `profile/PrivacyScreen.tsx` |
| Help center (FAQ, contact us) | `profile/HelpScreen.tsx` |

`Heading` n'est pas un écran mais un composant de barre de titre → `components/TopBar.tsx`.

### Maquettée mais non implémentée

| Maquette | Constat |
|---|---|
| **Favorite Services** | Aucun écran correspondant. Pendant de « Favorite Doc » pour les fournisseurs et services |

### Implémentée mais non maquettée — 17 écrans

Aucune de ces vues n'a de référence visuelle. Elles ont donc été conçues sans maquette et **ne peuvent
pas être auditées** ; leur cohérence avec le reste du produit repose entièrement sur le référentiel de
style.

- `assistant/ChatbotScreen.tsx` — **l'assistant IA, cœur différenciateur du produit selon la SFD §4.4**
- `herd/HerdListScreen.tsx`, `herd/AddAnimalScreen.tsx`, `herd/AnimalDetailScreen.tsx`,
  `herd/FarmListScreen.tsx` — toute la gestion du cheptel (SFD §4.13) et le dossier médical (§4.6)
- `fiches/FichesListScreen.tsx`, `fiches/FicheDetailScreen.tsx`
- `marketplace/ProductListScreen.tsx`, `marketplace/CartScreen.tsx`,
  `marketplace/OrderHistoryScreen.tsx`
- `payment/OrangeMoneyScreen.tsx`, `payment/MtnMomoScreen.tsx`, `payment/MobileMoneyForm.tsx`,
  `payment/AddCardScreen.tsx`, `payment/PaymentRecapScreen.tsx`
- `security/PinSetupScreen.tsx`, `security/PinUnlockScreen.tsx`
- `vets/GenderListScreen.tsx`, `vets/TopRatedScreen.tsx`

**Aucun écran vétérinaire n'est maquetté**, ce qui est cohérent avec l'absence d'implémentation
(bloc 1 du plan) : l'interface praticien n'existe ni en design, ni en code. Elle devra être maquettée
avant d'être développée.

---

## 3. Constats de fond

### C-01 — La maquette et la SFD se contredisent sur l'accueil éleveur ⚠️

La SFD §4.2 décrit l'accueil éleveur comme **six boutons à icônes larges** — Mon Cheptel, Consulter un
Vétérinaire, Mes Animaux malades, Mes RDV, Mes Messages, Urgence — complétés d'un **widget météo**,
d'un **bandeau d'alertes sanitaires régionales** et d'un **bouton Urgence rouge permanent**.

La maquette montre tout autre chose : un annuaire de prestataires — bandeau de praticien mis en avant,
catégories (Éleveurs / Producteurs / Vétérinaires / Marché), liste de fiches notées — avec une barre
de navigation à quatre onglets. **Ni météo, ni bandeau d'alertes, ni bouton d'urgence.**

Ce ne sont pas deux variantes du même écran, mais deux conceptions incompatibles du produit :
la SFD décrit un poste de pilotage sanitaire, la maquette une place de marché de services.

**Cette contradiction ne peut pas être tranchée par l'équipe de développement.** Conformément au
principe de gouvernance, elle est portée à l'arbitrage du propriétaire du produit. Tant qu'elle n'est
pas rendue, FR-038 à FR-040 (urgence permanente, alertes de zone, météo) restent sans référence
visuelle.

### C-02 — Le module de vente est bien au périmètre, la SFD est en défaut

L'écran `Producteur` fait apparaître une catégorie **« Marché »** et liste des fournisseurs —
« PROVENDERIE FHF, aliments pour bétails », « DeutschWeltZentrum, médicaments et accessoires
d'élevage ».

Le module de vente présent dans le code est donc **intentionnel et maquetté**. La divergence relevée
en FR-055 ne vient pas d'un code hors périmètre mais d'une **SFD incomplète**.

**Conséquence** : FR-055 se résout en faveur de l'intégration. La SFD doit être complétée d'une
section décrivant le module, et non l'inverse. Cela lève l'incertitude d'effort signalée au plan.

### C-03 — L'implémentation dépasse la maquette sur l'inscription

La maquette `Sign Up` ne prévoit que six champs — Nom, Mot De Passe, Email, Numéro, Date De Naissance
— et **ne couvre pas l'inscription vétérinaire**.

L'implémentation est plus complète et plus proche de la SFD §4.1.2 : sélecteur de rôle, spécialité,
genre, années d'expérience, **numéro d'ordre professionnel**, domaine de focus.

**Écart restant avec la SFD §4.1.2**, non couvert ni par la maquette ni par le code : le **dépôt
obligatoire du diplôme et de la carte d'ordre** (JPG/PDF, 5 Mo max), la **zone d'intervention** et le
**tarif de consultation par défaut**. Sans dépôt de pièces, la validation administrateur prévue par la
SFD n'a rien à valider.

### C-04 — Défaut dans la maquette elle-même

Sur `Sign Up`, le champ **Nom** porte le texte indicatif `example@example.com`, manifestement copié du
champ Email. L'implémentation utilise « Votre nom complet », ce qui est correct. **Le code a raison
contre la maquette** — écart délibéré à consigner au titre de FR-053, sans correction du code.

### C-05 — La palette est déjà conforme

`mobile/src/theme/colors.ts` porte la mention « palette de marque relevée sur le Figma MokineVet2 » et
définit brun chocolat `#4A2317` + vert `#3DB54A`, ce que les maquettes confirment. Le socle
chromatique est donc aligné ; l'audit FR-052 portera sur les valeurs résiduelles codées en dur écran
par écran, pas sur la palette elle-même.

### C-06 — Deux variantes d'accueil non arbitrées

`Home.png` présente trois catégories — Éleveurs, **Fournisseurs**, Vétérinaires.
`Producteur.png` en présente quatre — Éleveurs, **Producteurs**, Vétérinaires, **Marché**.

Les libellés et le nombre de catégories diffèrent. Il faut savoir laquelle fait foi, ou s'il s'agit de
deux états selon le profil.

### C-07 — Défauts d'implémentation observés à l'exécution

Relevés sur émulateur, indépendamment de toute maquette :

- **Titre d'écran tronqué** : sur `Nouveau Compte`, le titre est coupé en haut et chevauche la zone de
  statut. La `TopBar` ne respecte pas la zone sûre.
- **Icône de réglages flottante** : un bouton engrenage se superpose au contenu en haut à droite, sans
  équivalent dans la maquette.
- **Icône d'application incorrecte** : l'icône déclarée était l'**icône par défaut du gabarit Expo**
  — un chevron bleu accompagné de ses guides de construction — et non le logo MokineVet.
  **Corrigé le 2026-08-21** : les six déclinaisons ont été régénérées à partir du symbole de
  `logo.jpg`, et le fond de l'icône adaptative est passé du bleu Expo au vert de marque.

### C-08 — Deux constats de C-07 étaient erronés

Vérification faite sur émulateur, deux des trois défauts relevés en C-07 n'en étaient pas :

- L'**icône d'engrenage flottante** est le bouton « Tools » d'**Expo Go**, un élément de
  l'environnement de développement. Elle n'existe pas dans l'application livrée.
- Le **titre tronqué** observé sur l'écran d'inscription venait de la position de défilement au
  moment de la capture, non d'un défaut de zone sûre. `TopBar` se comporte correctement.

Seul le défaut d'icône était réel. Les tâches T117 et T118 sont donc sans objet.

---

## 4. Ce que cet export ne permet toujours pas

- Les **valeurs exactes** — espacements, rayons, graisses, tailles de police — ne sont pas mesurables
  sur des PNG. L'audit FR-052 restera approximatif sans accès au fichier.
- Les **états non maquettés** — chargement, vide, erreur, hors ligne — ne figurent nulle part, ce que
  FR-054 anticipait déjà.
- Les **neuf exports vides** (`All appointment`) sont à refournir.
- L'**interface vétérinaire** n'est pas maquettée et devra l'être avant le bloc 1.

---

## 5. Décisions requises du propriétaire du produit

| Réf | Question | Bloque |
|---|---|---|
| C-01 | Accueil éleveur : la SFD §4.2 ou la maquette ? Les deux sont incompatibles | FR-038 à FR-040 |
| C-06 | Trois catégories (Fournisseurs) ou quatre (Producteurs + Marché) ? | Écran d'accueil |
| — | Maquetter l'interface vétérinaire | Bloc 1, non bloquant pour démarrer |
| — | Refournir les neuf exports vides `All appointment` | Audit de l'agenda |

**Résolu par cet export** : FR-055 (module de vente) — au périmètre, la SFD est à compléter.

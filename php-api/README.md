# MokineVeto API — implémentation PHP

Backend de MokineVeto pour l'hébergement mutualisé Camoo, en remplacement du
backend Node/Express.

## Pourquoi PHP

L'hébergement ne peut pas maintenir un processus long en vie : la limite de
processus (LVE) fait échouer les scripts d'installation npm, empêche le moteur
natif de Prisma de démarrer, et refuse par intermittence d'ouvrir un shell.
Aucun mécanisme d'exposition d'application Node n'y est par ailleurs disponible
— ni Passenger, ni sélecteur Node cPanel.

PHP est le mode d'exécution natif de cette machine : Apache lance l'interpréteur
à chaque requête, il n'y a aucun processus à superviser.

## Contrat

Les chemins et les formats de réponse reproduisent **exactement** ceux du
backend Node remplacé — `{ success, data }` ou `{ success, error }`.
L'application mobile n'a aucune modification à subir.

Les empreintes de mot de passe restent compatibles : `password_verify` accepte
les préfixes `$2a$` et `$2b$` produits par `bcryptjs`.

## Arborescence de déploiement

```
/home/<compte>/
├─ mokineveto.env          identifiants — HORS de la racine web
├─ uploads/                pièces déposées, hors racine web
└─ public_html/api/        ce répertoire
   ├─ .htaccess
   ├─ index.php
   ├─ lib/
   └─ routes/
```

Le fichier d'environnement et les fichiers déposés vivent **au-dessus** de
`public_html` : aucune URL ne peut les atteindre, même si la réécriture Apache
venait à être désactivée.

## Variables d'environnement

```
APP_ENV=production
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=
DB_USER=
DB_PASS=
JWT_SECRET=            # 32 caractères minimum, sinon l'API refuse de servir
OPENWEATHER_API_KEY=   # facultatif ; sans clé, la météo répond available:false
```

## Couverture

Implémenté : authentification, annuaire vétérinaire et créneaux, exploitations,
cheptel et événements de santé, alertes régionales, notifications, pièces
justificatives, météo.

Reste à porter : rendez-vous, messagerie, fiches pathologiques, marketplace,
paiements, assistant IA, administration.

Le temps réel de `socket.io` n'a pas d'équivalent en PHP : la messagerie devra
reposer sur de l'interrogation périodique.

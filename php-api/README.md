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

Le compte FTP `trugro9159_mokin` est enraciné **directement sur la racine
web** de `mokineveto.trugroup.cm` (pas de `public_html` intermédiaire) : le
premier niveau du compte est ce que sert Apache.

```
/home/trugro9159/mokineveto/    racine web (= racine FTP)
├─ .env                         identifiants — protégés par .htaccess, pas par l'emplacement
├─ .htaccess                    bloque .env et les fichiers .sql/.log/.bak/.ini
├─ uploads/                     pièces déposées (protégées par api/.htaccess)
├─ index.html, manifest.json…   la PWA (mobile/dist)
└─ api/                         ce répertoire (php-api)
   ├─ .htaccess
   ├─ index.php
   ├─ lib/
   └─ routes/
```

Contrairement au schéma habituel (`.env` hors racine web), aucun répertoire
n'est hors d'atteinte d'une URL sur ce compte : la seule protection est le
`.htaccess` racine, qui refuse explicitement `.env`. S'il venait à être
ignoré par le serveur, les identifiants seraient exposés — risque résiduel
assumé, à corriger si le compte migre vers un hébergement avec un répertoire
réellement hors racine web.

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

# Paiements mobile money, relayés par Sungku (sungku.trugroup.cm) vers pawaPay.
# MokineVeto y est enrôlé comme projet partenaire (PARTNER_MOKINEVETO_* dans
# le .env de Sungku, voir PartnerAuth côté Sungku) — pas de flux
# d'enrôlement HTTP, la clé est configurée directement par un humain.
SUNGKU_BASE_URL=http://sungku.trugroup.cm
SUNGKU_API_KEY=            # = PARTNER_MOKINEVETO_API_KEY côté Sungku
SUNGKU_WEBHOOK_SECRET=     # = PARTNER_MOKINEVETO_WEBHOOK_SECRET côté Sungku, pour vérifier /payments/webhook/sungku
# La devise de paiement suit le pays de l'utilisateur (voir lib/Countries.php),
# pas une variable d'environnement.
```

## Couverture

Implémenté : authentification, annuaire vétérinaire et créneaux, exploitations,
cheptel et événements de santé, alertes régionales, notifications, pièces
justificatives, météo.

Reste à porter : rendez-vous, messagerie, fiches pathologiques, marketplace,
paiements, assistant IA, administration.

Le temps réel de `socket.io` n'a pas d'équivalent en PHP : la messagerie devra
reposer sur de l'interrogation périodique.

# Hébergement du backend chez Camoo — relevé et plan d'adaptation

**Date** : 2026-08-21
**Compte audité** : `ssh_trugro9159@ftp-12.camoo.net:22` (répertoire `/home/ssh_trugro9159`)
**Motivation** : la SFD §7.3 impose l'hébergement des données africaines en Afrique. Railway et
Vercel n'y répondent pas — c'est l'écart T091. Camoo, hébergeur camerounais, y répondrait.

> **Sécurité** — le mot de passe SSH de ce compte a circulé en clair. Il doit être changé.
> Une clé publique de déploiement (`sungku-camoo-deploy`) a été installée dans
> `~/.ssh/authorized_keys` (permissions 700/600) le 2026-08-21 : l'accès par clé est désormais
> possible et le mot de passe peut être révoqué sans perdre l'accès.

---

## 1. Ce que la machine offre réellement

Relevé par inspection directe, et non par supposition.

| Capacité | État | Détail |
|---|---|---|
| Node.js système | ⚠️ v10.19.0 | Fin de vie depuis 2021, sans `npm`. Inutilisable pour ce backend |
| **Node.js 20** | ✅ **installé** | `~/.local/node20/bin/node` v20.18.0 + npm 10.8.2, déployé depuis l'archive officielle |
| Sortie HTTPS | ✅ | `fetch()` renvoie 200 depuis Node 20 — les appels sortants (Camoo Pay, OpenWeather, Anthropic, push, SMTP) sont possibles |
| Écoute réseau | ✅ | Liaison possible sur `127.0.0.1` et `0.0.0.0` |
| MySQL | ✅ | `127.0.0.1:3306` accessible |
| **PostgreSQL** | ❌ | Absent, connexion refusée sur 5432 |
| PostGIS | ❌ | Sans objet, pas de PostgreSQL |
| PHP | ✅ 7.4.33 | `allow_url_fopen=1`, `max_execution_time=0` |
| Passenger / sélecteur Node cPanel | ❌ | Ni `/opt/alt/alt-nodejs*`, ni Passenger, ni Application Manager |
| `crontab` en ligne de commande | ❌ | À configurer depuis l'interface cPanel |
| `nohup`, `setsid`, `screen`, `tmux` | ❌ | Aucun outil de détachement de processus |
| `curl`, `xz`, `python3` | ❌ | `wget` et `git` présents |
| Certificats CA système | ❌ | `wget` échoue sur la vérification ; Node 20 embarque son propre magasin et n'est pas affecté |
| Occupation disque | 175 Mo | Marge disponible |

**Existant sur le compte** : `~/mokinevet-app`, une implémentation **PHP/MySQL antérieure** du même
produit (`db.php`, `authController.php`, `dashboard.php`, `mokinevet.sql`), et `~/mokinevet`, un site
vitrine statique.

---

## 2. Verdict

Le compte **peut faire tourner le backend Node**, mais **ne peut pas l'exposer ni le maintenir en
vie** par un moyen supporté.

Trois verrous, par ordre de gravité :

1. **Aucun mécanisme d'exposition.** Sans Passenger ni sélecteur Node, rien ne relie le serveur web
   à un processus Node. Il faut interposer un relais PHP — non supporté par l'hébergeur, et qui ne
   laisse pas passer les WebSockets.
2. **Aucune supervision de processus.** Ni `nohup`, ni `setsid`, ni `screen`, ni `crontab` en ligne
   de commande. Un processus lancé depuis SSH n'a aucune garantie de survivre à la déconnexion — ce
   point **n'a pas pu être vérifié**, le lancement d'un démon distant ayant été refusé par la
   politique de sécurité de l'environnement de développement. Il reste la tâche planifiée cPanel,
   configurable depuis l'interface web.
3. **PostgreSQL absent.** Le schéma Prisma doit passer à MySQL, et la géolocalisation du bloc 3 perd
   PostGIS.

---

## 2 bis. Ce que le déploiement effectif a révélé

Le déploiement a été engagé le 2026-08-21. Trois obstacles supplémentaires sont apparus, invisibles à
la simple inspection.

### Limite de processus (LVE)

`npm install` échoue en `EAGAIN` dès qu'un paquet exécute un script post-installation
(`esbuild`, utilisé par `tsx`). Plus largement, la machine refuse par intermittence d'ouvrir de
nouveaux shells (« Unable to exec ») dès que quelques processus sont actifs. `os.cpus().length`
renvoie `0`, signe d'un conteneur très contraint.

**Conséquence retenue** : le serveur n'exécute que du JavaScript **compilé en local**. `tsx` a
disparu des dépendances de production, une compilation `tsconfig.build.json` produit `dist/`, et les
dépendances sont installées avec `--ignore-scripts`.

### Le moteur natif de Prisma ne démarre pas

- Moteur *library* : `PANIC: timer has gone away` — le runtime Tokio ne parvient pas à créer ses
  threads.
- Moteur *binary* : le processus du moteur ne peut pas être lancé, l'appel reste suspendu.

**Diagnostic déterminant** : la même base MySQL répond parfaitement avec un pilote purement
JavaScript (`mysql2`) — `SELECT VERSION()` renvoie `8.0.45`. Le problème n'est donc ni la base, ni les
identifiants, ni le réseau : il est exclusivement dans les composants natifs de Prisma.

**Conséquence retenue** : montée de Prisma 5.20 → 6.19 et passage à l'**adaptateur de pilote**
`@prisma/adapter-mariadb`, qui délègue les connexions à un client MySQL JavaScript et supprime la
dépendance au moteur natif. Voir `src/lib/prisma.ts`.

### Écoute réseau restreinte

Sur une machine mutualisée, écouter sur `0.0.0.0` rendrait le port joignable par les autres comptes.
`BIND_HOST` a été ajouté à la configuration : la production écoute sur `127.0.0.1`, l'exposition
passant par le relais HTTP. Le comportement historique (`0.0.0.0`, requis par Railway) reste la
valeur par défaut.

---

## 3. Plan d'adaptation, si l'on maintient ce choix

### 3.1 Base de données : PostgreSQL → MySQL

- `datasource db { provider = "mysql" }` dans `prisma/schema.prisma`.
- Les 22 modèles et les énumérations passent sans réécriture : Prisma gère les `enum` en MySQL.
  `@db.Text` est également supporté.
- **Perte à assumer** : PostGIS. Les requêtes géospatiales prévues en T045 (recherche de praticiens
  par distance, FR-014 et FR-015) devront reposer sur un calcul de Haversine en SQL ou en
  application. Acceptable à l'échelle visée, mais moins performant et sans index spatial.
- Reprise des données existantes à prévoir : la base Railway actuelle est peuplée.

### 3.2 Exécution

```
~/.local/node20/          runtime Node 20 (déjà en place)
~/mokineveto-api/         code du backend
  ├─ dist ou src          selon la stratégie de build
  ├─ node_modules         npm ci --omit=dev, avec le npm de node20
  └─ .env                 DATABASE_URL mysql://…@127.0.0.1:3306/…
```

Le backend écoute sur `127.0.0.1:<port>` — jamais publiquement, l'exposition passe par le serveur web.

### 3.3 Exposition : relais PHP

Un contrôleur frontal PHP dans `public_html/api/` reçoit les requêtes et les retransmet au processus
Node local. `allow_url_fopen=1` permet de le faire par contexte de flux, sans dépendre de l'extension
curl — dont la présence dans le PHP web reste à confirmer, le PHP en ligne de commande étant une
compilation minimale.

**Conséquence directe sur le produit** : les WebSockets ne passent pas un relais PHP. `socket.io`
devra être forcé en **transport long-polling**. Cela dégrade le temps réel — présence des praticiens,
statut de disponibilité, messagerie instantanée — sans le supprimer. La consultation audio/vidéo du
bloc 3 reposant sur WebRTC via un prestataire tiers n'est pas affectée par ce point.

### 3.4 Maintien en vie

Tâche planifiée cPanel, toutes les 5 minutes, appelant un script qui interroge le port local et
relance le processus s'il ne répond pas. À configurer depuis l'interface cPanel, `crontab` étant
inaccessible en ligne de commande.

### 3.5 Tâches périodiques

`node-cron` (`startCronJobs`) suppose un processus vivant en permanence — hypothèse fragile ici. Les
rappels de vaccination et de rendez-vous (SFD §4.11) doivent basculer sur des tâches planifiées
cPanel appelant un point d'entrée HTTP authentifié.

### 3.6 Ce que ce choix améliore

- **Conformité SFD §7.3** : données hébergées au Cameroun — l'écart T091 se referme.
- **Persistance des fichiers déposés** : disque durable, là où le disque Railway est éphémère entre
  déploiements. C'est un gain net pour les pièces justificatives et les documents du dossier médical.

---

## 4. Recommandation

**Un VPS Camoo plutôt que ce mutualisé.** Il conserve le Cameroun — donc la conformité §7.3 — et
supprime les trois verrous d'un coup : PostgreSQL et PostGIS installables, WebSockets natifs,
supervision de processus réelle. Le surcoût est faible au regard des contournements ci-dessus, dont
aucun n'est supporté par l'hébergeur et qui devront être maintenus à chaque montée de version.

Si le mutualisé est maintenu malgré tout, le plan de la section 3 est applicable, avec deux réserves
à assumer explicitement : le temps réel dégradé et la survie du processus non garantie.

---

## 5. Points à vérifier avant d'engager

1. La tâche planifiée cPanel est-elle disponible sur cette formule ?
2. Le PHP servi par le web dispose-t-il de `curl` et `pdo_mysql` ? La compilation en ligne de commande
   ne les expose pas.
3. Un processus détaché survit-il à la fermeture de la session SSH ? **Non vérifié.**
4. Quel domaine sert `public_html`, et quel port local peut être retenu durablement ?
5. Camoo accepterait-il d'activer un sélecteur Node.js sur ce compte ? Cela lèverait à lui seul les
   verrous 1 et 2.

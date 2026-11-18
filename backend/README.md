# Selline — Backend (API REST)

Node.js 22.13+ · Express 5 · SQLite intégré à Node (`node:sqlite`, rien à compiler) · JWT · bcrypt. Respecte le contrat `docs/API.md` du frontend.

## Démarrage

```bash
npm install
cp .env.example .env        # puis éditez JWT_SECRET (voir plus bas)
npm start                   # http://localhost:3000/api
```

Au premier lancement (hors production), des données de démonstration sont créées :
`demo@selline.cm` (acheteur) et `vendeur@selline.cm` (vendeur), mot de passe `demo1234`.
Repartir de zéro : `npm run reset` puis `npm start`. Désactiver la démo : `SEED_DEMO=false`.

Côté frontend, rien à changer : le proxy Vite envoie déjà `/api` vers `http://localhost:3000`.
Lancez `npm start` ici, `npm run dev` dans `selline-frontend` (et **plus** `npm run mock`).

## Tests

```bash
npm test     # 12 scénarios : auth, catalogue, commandes, stock, vendeur, avis, messagerie, sécurité…
```

## Structure

```
src/index.js        démarrage        src/app.js       assemblage Express (sécurité, limites)
src/db.js           schéma SQLite    src/schemas.js   validation (messages en français)
src/lib.js          sérialiseurs, statuts de commande
src/routes/         auth · account · catalog · orders · seller · messages · uploads
src/seed.js         données de démo  test/api.test.js tests d'intégration
```

## Règles métier

- **Prix, stock et livraison** sont recalculés par le serveur ; le total envoyé par le client est ignoré.
  Livraison = somme, par boutique, du frais le plus élevé (comme le panier du frontend).
- **Stock** décrémenté dans une transaction (jamais négatif) ; restitué si la boutique annule.
- **Statuts** : une commande peut contenir des produits de plusieurs boutiques. Chaque boutique gère le sien
  (`pending → confirmed → shipped → delivered`, annulation possible avant la livraison) ; le statut vu par
  l'acheteur en est déduit.
- **Avis** : uniquement après livraison du produit, un seul par produit et par acheteur.
- **Photos** : JPG/PNG/WebP/GIF (type vérifié sur le contenu), 8 Mo max, stockées dans `UPLOAD_DIR`
  et servies sur `/api/uploads/<nom-aléatoire>`. Seules ces images sont acceptées comme photo de profil ou de produit.
- **Boutique** : `verified` vaut toujours `false` à la création ; la vérification est une action d'administration
  (pour l'instant : `UPDATE shops SET verified = 1 WHERE id = '…'` dans la base).

## Sécurité en place

Mots de passe hachés (bcrypt) · JWT HS256 de 30 jours · réponses identiques pour e-mail inconnu / mauvais mot de passe ·
requêtes SQL paramétrées · validation stricte des entrées · contrôle de propriété sur chaque ressource (commandes,
adresses, conversations, produits) · limitation de débit (connexion, inscription, envois) · en-têtes Helmet · CORS restreint ·
fichiers envoyés servis en `sandbox` + `nosniff` · aucune trace technique dans les erreurs renvoyées.

## Avant la mise en ligne

1. `NODE_ENV=production` et un `JWT_SECRET` long et aléatoire (le serveur refuse de démarrer sans).
2. HTTPS obligatoire (reverse proxy Nginx/Caddy ou plateforme d'hébergement) ; `TRUST_PROXY=1` derrière un proxy.
3. `CORS_ORIGINS` = l'URL du frontend ; `PUBLIC_URL` si l'API est sur un autre domaine.
4. **Persistance** : sauvegardez `data/` (base) et `uploads/` (images). Sur une plateforme à disque éphémère,
   montez un volume.
5. SQLite convient à un seul serveur et à un trafic modéré ; au-delà, migrer vers PostgreSQL.

## Ce qui n'est pas encore fait (à prévoir)

- **Paiement réel** : Mobile Money (MTN MoMo / Orange Money) et carte ne sont pas branchés. Une commande payée
  par ces moyens reste « en attente » : il faut intégrer un agrégateur (ex. CinetPay, Notch Pay, Flutterwave)
  avec confirmation par webhook.
- **Mot de passe oublié** : la route répond 204 mais n'envoie aucun e-mail (service d'envoi + page de réinitialisation à ajouter).
- **Déconnexion serveur** : un jeton reste valide jusqu'à son expiration (30 jours), même après un changement de mot de passe.
- **Rôle administrateur** (vérification des boutiques, modération).

## Administration

Espace `/admin` du site (tableau de bord, boutiques, utilisateurs, produits, avis, catégories). Routes API : `/api/admin/*`.

- **Devenir admin** : impossible depuis le site ou l'API. Sur le serveur : `npm run admin -- email@exemple.cm [mot-de-passe]`
  (promeut le compte s'il existe, sinon le crée), ou variables `ADMIN_EMAIL` / `ADMIN_PASSWORD` au démarrage. En développement, `admin@selline.cm` / `demo1234` est créé automatiquement.
- **Boutique suspendue** : produits masqués du site et non achetables ; le vendeur garde la lecture de son espace mais ne peut plus rien modifier.
- **Utilisateur bloqué** : connexion refusée, session en cours coupée, produits de sa boutique masqués. Un admin ne peut pas être bloqué.
- **Journal** : chaque action d'administration est enregistrée (table `admin_actions`) et visible sur le tableau de bord.
- **Mise à jour d'une ancienne base** : les nouvelles colonnes sont ajoutées automatiquement au démarrage, sans perte de données.

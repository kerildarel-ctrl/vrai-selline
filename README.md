# Selline

Marketplace en ligne pensée pour le Cameroun : `frontend/` (React + Vite) et `backend/` (Express + SQLite).

## Lancer (une seule commande)

Prérequis : [Node.js 22.13 ou plus](https://nodejs.org) (prenez la version « LTS »). Rien d'autre à installer.

```bash
npm start
```

(ou double-clic sur `start.bat` sous Windows)

Au premier lancement, le script installe les dépendances, crée la configuration et des données de démonstration,
puis démarre l'API (`http://localhost:3000`) et le site (`http://localhost:5173`, ouvert automatiquement).
`Ctrl + C` arrête tout.

**Comptes de démo** (mot de passe `demo1234`) : `demo@selline.cm` (acheteur) · `vendeur@selline.cm` (vendeur) · `admin@selline.cm` (administrateur, espace `/admin`).

## Autres commandes

| Commande | Effet |
|---|---|
| `npm test` | Tests automatiques du backend |
| `npm start -- --no-open` | Lance sans ouvrir le navigateur |
| `cd backend && npm run admin -- email@exemple.cm [mot-de-passe]` | Crée un administrateur, ou promeut un compte existant |
| `cd backend && npm run reset` | Efface la base (repart des données de démo) |

Détails : `backend/README.md` (API, sécurité, mise en ligne) et `frontend/docs/API.md` (contrat d'API).

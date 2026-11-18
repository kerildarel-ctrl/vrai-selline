# Selline – frontend

Interface React + Vite + Tailwind, responsive (mobile et PC), entièrement branchée sur une API : **aucune donnée factice**.
Il ne reste qu'à fournir le backend décrit dans [`docs/API.md`](docs/API.md).

## Démarrage
```bash
npm install
cp .env.example .env      # adaptez VITE_API_URL et BACKEND_URL
npm run dev               # /api est redirigé vers BACKEND_URL
npm run build             # production -> dist/
```
En production, soit le backend sert `/api` sur le même domaine, soit définissez `VITE_API_URL=https://api.votre-domaine.com` avant le build (pensez au CORS).

## Structure
- `src/lib/api.ts` – tous les appels réseau (un seul endroit à adapter)
- `src/lib/types.ts` – modèles de données échangés avec le backend
- `src/context/` – session utilisateur (`AuthContext`) et panier persistant (`CartContext`)
- `src/components/` – en-tête, navigation mobile, mises en page, composants communs
- `src/pages/` – écrans acheteur et vendeur (favoris, avis, messagerie et notifications inclus)

# Contrat d'API attendu par le frontend

Toutes les routes sont préfixées par `VITE_API_URL` (par défaut `/api`). JSON partout, sauf `/uploads` (multipart).
Authentification : en-tête `Authorization: Bearer <token>`. Un `401` déconnecte automatiquement l'utilisateur.
Erreurs : statut HTTP ≥ 400 avec `{ "message": "texte affiché à l'utilisateur" }`.

## Authentification
| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| POST | `/auth/register` | `{firstName,lastName,email,phone,password}` | `{token,user}` |
| POST | `/auth/login` | `{email,password}` | `{token,user}` |
| POST | `/auth/forgot-password` | `{email}` | `204` (toujours, même si l'e-mail est inconnu) |
| GET | `/auth/me` | – | `User` |

## Compte
| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| PATCH | `/users/me` | `{firstName,lastName,phone?,city?,avatar?}` | `User` (`avatar` : URL renvoyée par `/uploads`, ou `null` pour supprimer la photo ; si la clé est absente, la photo est conservée) |
| PUT | `/users/me/password` | `{currentPassword,newPassword}` | `204` |
| GET | `/addresses` | – | `Address[]` |
| POST | `/addresses` | `{fullName,phone,city,quarter,details?}` | `Address` |
| DELETE | `/addresses/:id` | – | `204` |

## Catalogue (public)
| Méthode | Route | Paramètres | Réponse |
|---|---|---|---|
| GET | `/categories` | – | `Category[]` |
| GET | `/products` | `q`, `category` (id), `sort` (`popular` \| `price_asc` \| `price_desc` \| `newest`), `page`, `limit`, filtres : `min`/`max` (prix FCFA), `freeShipping=1`, `verified=1` (boutiques vérifiées), `rating` (note minimale, ex. 4) | `{items:Product[],total,page,pages}` |
| GET | `/products/:id` | – | `Product` |

## Commandes (acheteur)
| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| POST | `/orders` | `{items:[{productId,qty}],addressId,paymentMethod:'mobile'\|'card'\|'cod',paymentPhone?}` | `Order` |
| GET | `/orders` | – | `Order[]` (plus récentes d'abord) |
| GET | `/orders/:id` | – | `Order` |

Le serveur est l'autorité sur les prix, le stock et les frais de livraison : il recalcule tout à la création.

## Vendeur (rôle `seller`)
| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| POST | `/seller/shop` | `{name,city,phone,description?}` | `Shop` (passe l'utilisateur au rôle `seller`) |
| GET | `/seller/stats` | – | `{ordersToday,revenueMonth,activeProducts,pendingOrders}` |
| GET | `/seller/products` | – | `Product[]` |
| GET | `/seller/products/:id` | – | `Product` |
| POST | `/seller/products` | `ProductInput` | `Product` |
| PUT | `/seller/products/:id` | `ProductInput` | `Product` |
| DELETE | `/seller/products/:id` | – | `204` |
| GET | `/seller/orders` | – | `SellerOrder[]` |
| PATCH | `/seller/orders/:id` | `{status}` | `SellerOrder` |
| POST | `/uploads` | multipart, champ `file` | `{url}` (URL publique de l'image) |

## Types
Définis dans `src/lib/types.ts` (source de vérité). En résumé :

```ts
User      { id, firstName, lastName, email, phone?, city?, avatar? (URL de la photo de profil), role: 'buyer'|'seller', shop?: Shop|null }
Shop      { id, name, city?, phone?, description?, verified }
Category  { id, name, slug? }
Product   { id, name, brand?, price, rating, reviewCount, images: string[],
            shop: {id,name,verified}, freeShipping, shippingFee, inStock, stock?,
            category?: Category|null, description? }
Address   { id, fullName, phone, city, quarter, details? }
Order     { id, reference, createdAt (ISO), status: 'pending'|'confirmed'|'shipped'|'delivered'|'cancelled',
            subtotal, shippingFee, total, paymentMethod,
            items: [{productId,name,image?,price,qty}], address? }
SellerOrder = Order + { customerName }
```
Les montants sont des entiers en FCFA.

---

## Favoris (connecté)
| Méthode | Route | Réponse |
|---|---|---|
| GET | `/favorites` | `Product[]` |
| PUT | `/favorites/:productId` | `204` (idempotent) |
| DELETE | `/favorites/:productId` | `204` (idempotent) |

## Avis clients
| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| GET | `/products/:id/reviews` | – | `{items:Review[],total,average}` (public, plus récents d'abord) |
| POST | `/products/:id/reviews` | `{rating:1..5,comment}` | `Review` |

`Review { id, author, rating, comment, createdAt }` : `author` est le prénom (+ initiale du nom) pour ne pas exposer l'identité complète.
Le backend décide qui peut noter (ex. avoir reçu le produit, un seul avis par produit) et renvoie un `message` clair sinon. Il met aussi à jour `rating` et `reviewCount` du produit.

## Messagerie acheteur ↔ vendeur
Les deux côtés utilisent les mêmes routes : le backend renvoie les conversations de l'utilisateur connecté (acheteur ou propriétaire de boutique).

| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| GET | `/conversations` | – | `Conversation[]` (dernier message en premier) |
| POST | `/conversations` | `{shopId,productId?}` | `Conversation` (réutilise la conversation existante avec cette boutique) |
| GET | `/conversations/:id` | – | `{conversation,messages:Message[]}` ; **marque comme lus** les messages reçus |
| POST | `/conversations/:id/messages` | `{text}` (≤ 2000 car.) | `Message` |

```ts
Conversation { id, title /* boutique (acheteur) ou client (vendeur) */, productName?, lastMessage?, lastAt?, unread }
Message      { id, text, createdAt, mine /* true si envoyé par l'utilisateur connecté */ }
```
Le frontend actualise la conversation ouverte toutes les 8 s (polling). Un WebSocket peut le remplacer plus tard sans toucher aux pages.

## Notifications
| Méthode | Route | Réponse |
|---|---|---|
| GET | `/notifications` | `AppNotification[]` |
| PATCH | `/notifications/:id/read` | `204` |
| POST | `/notifications/read-all` | `204` |
| GET | `/me/counters` | `{notifications,messages}` (non lus ; appelé toutes les 45 s) |

`AppNotification { id, title, body?, link?, read, createdAt }` : `link` est une route du frontend (ex. `/orders/123`, `/seller/orders`, `/messages/45`).
Événements conseillés : commande créée (vendeur), changement de statut (acheteur), nouveau message, nouvel avis sur un produit.

## Administration (compte `isAdmin`, sinon 403)

`User` renvoie aussi `isAdmin: boolean`, et `Shop` `suspended: boolean`. Un compte bloqué reçoit 403 à la connexion, 401 sur une session existante.

| Méthode | Route | Description |
|---|---|---|
| GET | `/admin/stats` | Utilisateurs, boutiques, commandes, chiffre d'affaires, série sur 14 jours, dernières commandes et actions |
| GET | `/admin/shops` | `q`, `status` (`verified` \| `unverified` \| `suspended`), `page`, `limit` |
| PATCH | `/admin/shops/:id` | `{verified?, suspended?}` |
| GET | `/admin/users` | `q`, `role` (`buyer` \| `seller` \| `admin`), `status=blocked`, `page`, `limit` |
| PATCH | `/admin/users/:id` | `{blocked}` (jamais sur un admin ni sur soi-même) |
| GET | `/admin/products` / DELETE `/admin/products/:id?reason=` | Liste ; suppression (le vendeur est notifié) |
| GET | `/admin/reviews` / DELETE `/admin/reviews/:id` | `q`, `rating`, `page` ; suppression (note du produit recalculée) |
| GET/POST | `/admin/categories` | Liste avec `productCount` ; création `{name}` |
| PUT/DELETE | `/admin/categories/:id` | Renommer `{name}` ; supprimer (les produits restent, sans catégorie) |

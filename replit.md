# FAP Expert — Gestion des interventions FAP

## Vue d'ensemble

Application web professionnelle en français pour le suivi des interventions de nettoyage de filtre à particules (FAP) dans un garage automobile.

## Architecture

pnpm workspace monorepo. Chaque package gère ses propres dépendances.

### Stack
- **Frontend** : React + Vite (TypeScript), Tailwind CSS, shadcn/ui, React Query, Wouter
- **Backend** : Express 5, Node.js 24
- **BDD** : PostgreSQL + Drizzle ORM
- **Validation** : Zod (v4), drizzle-zod
- **API codegen** : Orval (depuis spec OpenAPI)
- **Build** : esbuild

### Packages principaux
| Package | Rôle |
|---|---|
| `artifacts/fap-expert` | Frontend React+Vite |
| `artifacts/api-server` | Backend Express |
| `lib/db` | Schéma Drizzle + connexion DB |
| `lib/api-spec` | Spec OpenAPI (source de vérité) |
| `lib/api-client-react` | Hooks React Query générés |
| `lib/api-zod` | Schémas Zod générés |

## Workflows (10 étapes)

`CREATION → CLIENT_VEHICULE → CONTROLE_INITIAL → VALIDATION_RECEPTION → ATELIER_ENTREE → NETTOYAGE → SECHAGE → CONTROLE_FINAL → RESTITUTION → CLOTURE`

## Comptes utilisateurs seed

| Identifiant | Mot de passe | Rôle |
|---|---|---|
| admin | admin123 | ADMIN |
| atelier | atelier123 | ATELIER |
| reception | reception123 | RECEPTION |

## Commandes clés

```bash
pnpm run typecheck                                  # vérification TypeScript complète
pnpm --filter @workspace/api-spec run codegen       # regénère hooks React Query + Zod
pnpm --filter @workspace/db run push                # push schéma BDD (dev)
pnpm --filter @workspace/api-server run build       # build serveur API
```

## Notes importantes

- Dev script frontend : `node start-dev.mjs` (wrapper Vite JS API, évite exit sur stdin fermé)
- Auth : champs `identifiant` / `motDePasse` (pas username/password)
- Mots de passe hashés SHA256 + sel "fap-expert-salt"
- Upload médias : base64 vers `/api/uploads/` (stocké sur disque)
- Rapport PDF : génère un rapport HTML imprimable via `/api/interventions/:id/rapport-pdf/download`
- Routes statistiques : `/api/statistiques/dashboard` et `/api/statistiques/kanban`

## Validations du workflow par étape

- **CONTROLE_INITIAL** : poids entrée + pression entrée + diagnostic accessoires + céramique (bloqué si FONDU)
- **VALIDATION_RECEPTION** : `validationClientReception` requis
- **ATELIER_ENTREE** : `validationEntreeAtelier` requis
- **NETTOYAGE** : `nettoyageTermine` requis
- **SECHAGE** : `sechageTermine` requis
- **CONTROLE_FINAL** : poids sortie + pression sortie + résultat + `validationTechnicien`
- **RESTITUTION** : rapport PDF généré + client informé + FAP restitué

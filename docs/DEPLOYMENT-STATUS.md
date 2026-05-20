# État du déploiement AWS

Compte : `503789396714` | Région : `us-west-2`

## DEV ✅

| | |
|---|---|
| URL | https://d1ng31qot2lqlk.cloudfront.net |
| ECR | `allofap-dev-api` |
| S3 | `allofap-dev-frontend` |
| ECS | `allofap-dev` / `allofap-dev-api` |
| GitHub env | `development` |
| Rôle CI | `arn:aws:iam::503789396714:role/allofap-dev-github-actions` |
| SSM | `/allofap/dev/*` |

## PROD ✅ (infra créée)

| | |
|---|---|
| URL | https://d2gd5cpo49tihx.cloudfront.net |
| ECR | `allofap-prod-api` |
| S3 | `allofap-prod-frontend` |
| ECS | `allofap-prod` / `allofap-prod-api` |
| GitHub env | `production` |
| Rôle CI | `arn:aws:iam::503789396714:role/allofap-prod-github-actions` |
| SSM | `/allofap/prod/*` *(à remplir — Neon prod)* |

## GitHub — deux environnements

Voir **`docs/GITHUB-ENVIRONMENTS.md`**

| Workflow | Branche |
|----------|---------|
| `deploy-dev.yml` | `develop` |
| `deploy-prod.yml` | `main` |

## Actions restantes

1. **GitHub** : configurer secrets/variables dans `development` et `production` (valeurs différentes pour `AWS_ROLE_ARN`)
2. **SSM prod** : `/allofap/prod/DATABASE_URL` (Neon prod), `SESSION_SECRET`, `SHOPIFY_WEBHOOK_SECRET`
3. **Docker** : `./scripts/deploy-api-dev.sh` et `./scripts/deploy-api-prod.sh`
4. **Front prod** : build + `aws s3 sync` vers `allofap-prod-frontend` (ou push `main` → CI)

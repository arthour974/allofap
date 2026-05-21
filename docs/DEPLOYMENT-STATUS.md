# État du déploiement AWS

Compte : `503789396714` | Région ressources : `eu-west-3` (Paris) | State Terraform : `us-west-2` (bucket bootstrap)

## DEV ✅ (Paris)

| | |
|---|---|
| URL | https://d1g5u7svim4wpo.cloudfront.net |
| ECR | `503789396714.dkr.ecr.eu-west-3.amazonaws.com/allofap-dev-api` |
| S3 front | `allofap-dev-frontend-euw3` |
| S3 médias | `allofap-dev-medias-euw3` |
| ECS | `allofap-dev` / `allofap-dev-api` |
| GitHub env | `development` |
| Rôle CI | `arn:aws:iam::503789396714:role/allofap-dev-github-actions` |
| SSM | `/allofap/dev/*` |

## PROD ✅ (Paris)

| | |
|---|---|
| URL | https://d23ez60aapzckk.cloudfront.net |
| ECR | `503789396714.dkr.ecr.eu-west-3.amazonaws.com/allofap-prod-api` |
| S3 front | `allofap-prod-frontend-euw3` |
| S3 médias | `allofap-prod-medias-euw3` |
| ECS | `allofap-prod` / `allofap-prod-api` |
| CloudFront | `E26N5272BUB06Y` |
| GitHub env | `production` |
| Rôle CI | `arn:aws:iam::503789396714:role/allofap-prod-github-actions` |
| SSM | `/allofap/prod/*` |

> **Ancienne URL prod (Oregon)** : `https://d2gd5cpo49tihx.cloudfront.net` — ne plus utiliser.

## GitHub — deux environnements

Voir **`docs/GITHUB-ENVIRONMENTS.md`**

| Workflow | Branche |
|----------|---------|
| `deploy-dev.yml` | `develop` |
| `deploy-prod.yml` | `main` |

## Déploiement manuel

```bash
./scripts/deploy-api-dev.sh    # dev Paris
./scripts/deploy-api-prod.sh   # prod Paris
```

Front : build puis `aws s3 sync` vers le bucket `frontend_bucket` (terraform output).

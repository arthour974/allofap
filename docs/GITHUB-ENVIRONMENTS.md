# Séparation DEV / PROD — GitHub & AWS

Deux environnements **isolés** : ressources AWS distinctes, state Terraform distinct, secrets distincts.

## Vue d’ensemble

| | **DEV** | **PROD** |
|---|---------|----------|
| Branche Git | `develop` | `main` |
| Workflow | `deploy-dev.yml` | `deploy-prod.yml` |
| Environnement GitHub | `development` | `production` |
| Terraform | `infra/environments/dev` | `infra/environments/prod` |
| State S3 | `dev/terraform.tfstate` | `prod/terraform.tfstate` |
| ECR | `allofap-dev-api` | `allofap-prod-api` |
| S3 front | `allofap-dev-frontend-euw3` | `allofap-prod-frontend-euw3` *(après migration Paris)* |
| S3 médias | `allofap-dev-medias-euw3` | `allofap-prod-medias-euw3` |
| SSM secrets | `/allofap/dev/*` | `/allofap/prod/*` |
| Neon | branche **dev** | branche **main** / prod |
| Rôle OIDC CI | `allofap-dev-github-actions` | `allofap-prod-github-actions` |

Même bucket de state Terraform (`allofap-terraform-state-503789396714`), **clés différentes** → pas de mélange dev/prod.

---

## Configuration GitHub (obligatoire)

Repo : **https://github.com/arthour974/allofap**  
→ **Settings → Environments**

### 1. Environnement `development`

| Type | Nom | Valeur |
|------|-----|--------|
| Secret | `AWS_ROLE_ARN` | `arn:aws:iam::503789396714:role/allofap-dev-github-actions` |
| Variable | `AWS_REGION` | `eu-west-3` |
| Variable | `TF_BACKEND_REGION` | `us-west-2` |
| Variable | `TF_STATE_BUCKET` | `allofap-terraform-state-503789396714` |
| Variable | `TF_LOCK_TABLE` | `allofap-terraform-locks` |

> **`TF_BACKEND_REGION`** : région du bucket S3 de state et de la table DynamoDB (bootstrap Oregon). **`AWS_REGION`** : région des ressources applicatives (Paris).

Déploiement : push sur **`develop`** → CI → **Deploy DEV** (automatique si CI OK), ou Actions → **Deploy DEV** (manuel).

### 2. Environnement `production`

| Type | Nom | Valeur |
|------|-----|--------|
| Secret | `AWS_ROLE_ARN` | `arn:aws:iam::503789396714:role/allofap-prod-github-actions` *(après `terraform apply` prod)* |
| Variable | `AWS_REGION` | `eu-west-3` |
| Variable | `TF_BACKEND_REGION` | `us-west-2` |
| Variable | `TF_STATE_BUCKET` | `allofap-terraform-state-503789396714` |
| Variable | `TF_LOCK_TABLE` | `allofap-terraform-locks` |

**Recommandé** : cocher **Required reviewers** (1 personne) avant déploiement prod.

Déploiement : merge vers **`main`** (ou push) → CI → **Deploy PROD** (automatique si CI OK), ou Actions → **Deploy PROD** (manuel).

> Les noms `AWS_ROLE_ARN`, `TF_STATE_BUCKET`, etc. sont **identiques** dans les deux environnements GitHub, mais les **valeurs** sont différentes (surtout `AWS_ROLE_ARN`).

---

## Workflows

| Fichier | Déclencheur | Cible |
|---------|-------------|--------|
| `ci.yml` | PR / push `develop` & `main` | Tests + validate Terraform dev & prod |
| `deploy-dev.yml` | CI réussie sur `develop` (push) + manuel | DEV uniquement |
| `deploy-prod.yml` | CI réussie sur `main` (push, ex. merge PR) + manuel | PROD uniquement |
| `deploy-aws.yml` | *(interne)* | Logique commune |

**Impossible** de déployer la prod depuis `develop` : workflows séparés + rôles IAM limités par branche.

---

## Première mise en place PROD (AWS)

```bash
cd infra/environments/prod
cp terraform.tfvars.example terraform.tfvars
cp backend.tfvars.example backend.tfvars
terraform init -backend-config=backend.tfvars
terraform apply -var="api_image_tag=bootstrap"
```

Puis SSM :

- `/allofap/prod/DATABASE_URL` → URL Neon **production**
- `/allofap/prod/SESSION_SECRET`
- `/allofap/prod/SHOPIFY_WEBHOOK_SECRET`

```bash
terraform output github_actions_role_arn
```

→ copier dans le secret GitHub **`production`** → `AWS_ROLE_ARN`.

---

## Flux de promotion

```
feature/* → PR → develop → CI → Deploy DEV → recette
                    ↓ PR merge
                  main → CI → Deploy PROD (approbation env. production si configurée)
```

> Les workflows **Deploy DEV/PROD** ne partent plus directement sur `push` : ils attendent la fin réussie du workflow **CI** sur la même branche, pour éviter un déploiement sans tests et pour fiabiliser le deploy après merge PR.

Ne jamais utiliser l’URL Neon dev en prod ni l’inverse.

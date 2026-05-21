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
| S3 front | `allofap-dev-frontend` | `allofap-prod-frontend` |
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
| Variable | `TF_STATE_BUCKET` | `allofap-terraform-state-503789396714` |
| Variable | `TF_LOCK_TABLE` | `allofap-terraform-locks` |

Déploiement : push sur **`develop`** ou Actions → **Deploy DEV**.

### 2. Environnement `production`

| Type | Nom | Valeur |
|------|-----|--------|
| Secret | `AWS_ROLE_ARN` | `arn:aws:iam::503789396714:role/allofap-prod-github-actions` *(après `terraform apply` prod)* |
| Variable | `AWS_REGION` | `eu-west-3` |
| Variable | `TF_STATE_BUCKET` | `allofap-terraform-state-503789396714` |
| Variable | `TF_LOCK_TABLE` | `allofap-terraform-locks` |

**Recommandé** : cocher **Required reviewers** (1 personne) avant déploiement prod.

Déploiement : push sur **`main`** ou Actions → **Deploy PROD**.

> Les noms `AWS_ROLE_ARN`, `TF_STATE_BUCKET`, etc. sont **identiques** dans les deux environnements GitHub, mais les **valeurs** sont différentes (surtout `AWS_ROLE_ARN`).

---

## Workflows

| Fichier | Déclencheur | Cible |
|---------|-------------|--------|
| `ci.yml` | PR / push `develop` & `main` | Tests + validate Terraform dev & prod |
| `deploy-dev.yml` | `develop` | DEV uniquement |
| `deploy-prod.yml` | `main` | PROD uniquement |
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
feature/* → PR → develop → Deploy DEV → recette
                    ↓ merge
                  main → Deploy PROD (avec approbation)
```

Ne jamais utiliser l’URL Neon dev en prod ni l’inverse.

# Déploiement AWS — allofap

Architecture cible :

- **Frontend** : build Vite → S3 + CloudFront (SPA)
- **API** : Docker → ECR → ECS Fargate derrière ALB
- **Routage** : CloudFront sert le front ; `/api/*` est proxy vers l’ALB (même origine, cookies session OK)
- **Base** : Neon (hors AWS) — `DATABASE_URL` dans SSM Parameter Store
- **CI/CD** : GitHub Actions + OIDC (pas de clés AWS dans GitHub)

Environnements :

| Env  | Branche GitHub | Dossier Terraform        | GitHub Environment |
|------|----------------|--------------------------|--------------------|
| dev  | `develop`      | `infra/environments/dev` | `development`      |
| prod | `main`         | `infra/environments/prod`| `production`       |

---

## Ce que vous devez faire (checklist)

### 1. Prérequis locaux

- Compte AWS avec droits admin (première fois)
- [Terraform](https://developer.hashicorp.com/terraform/install) ≥ 1.5
- [AWS CLI](https://aws.amazon.com/cli/) configuré (`aws configure` ou SSO)
- Repo poussé sur **GitHub** (`owner/allofap`)

### 2. Bootstrap Terraform (une fois par compte AWS)

```bash
cd infra/bootstrap
terraform init
terraform apply -var="aws_region=us-west-2"
```

Notez les outputs `state_bucket` et `lock_table`.

### 3. Configurer dev puis prod

Pour **chaque** environnement (`dev`, puis `prod`) :

```bash
cd infra/environments/dev   # ou prod

cp terraform.tfvars.example terraform.tfvars
cp backend.tfvars.example backend.tfvars
# Éditer : github_repository, terraform_state_bucket, terraform_lock_table, aws_region
```

Initialiser le backend :

```bash
terraform init -backend-config=backend.tfvars
```

Premier déploiement infra (local ou via CI après étape 4) :

```bash
terraform apply -var="api_image_tag=bootstrap"
```

### 4. Secrets SSM (obligatoire après le 1er `terraform apply`)

Dans AWS Console → **Systems Manager** → **Parameter Store**, mettre à jour (SecureString) :

| Paramètre | Exemple dev |
|-----------|-------------|
| `/allofap/dev/DATABASE_URL` | URL Neon branche **dev** |
| `/allofap/dev/SESSION_SECRET` | Chaîne aléatoire longue |
| `/allofap/dev/SHOPIFY_WEBHOOK_SECRET` | Secret Shopify |

Idem pour `/allofap/prod/...` en production.

```bash
aws ssm put-parameter --name "/allofap/dev/DATABASE_URL" \
  --type SecureString --value "postgresql://..." --overwrite
```

### 5. GitHub — environnements & secrets

**Settings → Environments** : créer `development` et `production`.

Pour chaque environnement, ajouter :

| Secret / Variable | Description |
|-------------------|-------------|
| `AWS_ROLE_ARN` | Secret — output Terraform `github_actions_role_arn` |
| `AWS_REGION` | Variable — ex. `us-west-2` |
| `TF_STATE_BUCKET` | Variable — bucket bootstrap (ex. `allofap-terraform-state-123456789012`) |
| `TF_LOCK_TABLE` | Variable — table DynamoDB bootstrap |

Protection **production** : cocher « Required reviewers » si vous voulez une approbation manuelle.

### 6. Branches Git

```bash
git checkout -b develop   # si pas encore fait
git push -u origin develop
```

- Push sur `develop` → déploie **dev**
- Push sur `main` → déploie **prod**

### 7. Première image Docker

Le premier `terraform apply` crée l’ECR vide. Ensuite :

- soit lancer le workflow **Deploy** sur `develop`
- soit en local :

```bash
aws ecr get-login-password --region us-west-2 | docker login ...
docker build -t <ecr_url>:latest .
docker push <ecr_url>:latest
```

Puis `terraform apply -var="api_image_tag=latest"` ou relancer la CI.

### 8. Vérification

- URL du site : `terraform output website_url`
- Santé API : `https://<cloudfront>/api/healthz`
- Logs ECS : CloudWatch → `/ecs/allofap-dev-api`

---

## Workflows GitHub

| Fichier | Rôle |
|---------|------|
| `.github/workflows/ci.yml` | PR / push : typecheck, build, `terraform validate` |
| `.github/workflows/deploy.yml` | Build API + front, `terraform apply`, S3 sync, invalidation CF |

Déploiement manuel : **Actions → Deploy → Run workflow** → choisir `dev` ou `prod`.

---

## Neon par environnement

- **dev** : branche Neon `dev` → `DATABASE_URL` dans `/allofap/dev/DATABASE_URL`
- **prod** : branche `main` (ou projet séparé) → `/allofap/prod/DATABASE_URL`

Schéma :

```bash
DATABASE_URL=<url-dev> pnpm --filter @workspace/db run push
```

---

## Shopify webhooks

URL webhook en prod :

```text
https://<votre-cloudfront-domain>/api/interventions/webhook
```

Utiliser le secret stocké dans SSM pour l’env concerné.

---

## Coûts & limites (MVP)

- VPC **default** + Fargate 0.25 vCPU / 512 Mo (dev)
- Pas de domaine custom dans ce Terraform (URL `*.cloudfront.net`) — ajouter Route53 + ACM plus tard
- Rôle GitHub CI large (`*` sur ressources) pour simplifier Terraform — à resserrer en prod mature

---

## Dépannage

| Problème | Piste |
|----------|--------|
| ECS unhealthy | Logs CloudWatch ; vérifier SSM secrets ≠ `CHANGE_ME` |
| 502 sur `/api` | ALB cible unhealthy ; security groups |
| CORS / cookies | Front et API via **même** domaine CloudFront |
| `terraform init` backend | Vérifier `backend.tfvars` (bucket, key, region) |
| OIDC denied | `github_repository` exact ; branche = `develop` ou `main` |

---

## Fichiers ajoutés

```
infra/bootstrap/          # State S3 + DynamoDB + OIDC GitHub
infra/modules/api-ecs/    # ECR, ECS, ALB, SSM
infra/modules/static-frontend/  # S3 + CloudFront
infra/modules/github-oidc/
infra/environments/dev/
infra/environments/prod/
Dockerfile
.github/workflows/ci.yml
.github/workflows/deploy.yml
docs/DEPLOYMENT.md
```

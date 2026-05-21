#!/usr/bin/env bash
# Déploie l'image API sur ECR dev et redémarre ECS.
# Prérequis : Docker Desktop démarré, AWS CLI configuré.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REGION="${AWS_REGION:-eu-west-3}"
ACCOUNT_ID="${AWS_ACCOUNT_ID:-503789396714}"
REPO_NAME="allofap-dev-api"
ECR="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}"
TAG="${1:-latest}"

cd "$ROOT"

echo "→ Login ECR (${REGION})"
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

echo "→ Build image (linux/amd64 pour ECS Fargate)"
docker build --platform linux/amd64 -t "$ECR:$TAG" .

echo "→ Push"
docker push "$ECR:$TAG"

echo "→ Terraform (task definition)"
cd "$ROOT/infra/environments/dev"
terraform apply -auto-approve -var="api_image_tag=$TAG"

echo "→ ECS force deployment"
aws ecs update-service \
  --cluster allofap-dev \
  --service allofap-dev-api \
  --force-new-deployment \
  --region "$REGION" \
  --output text

echo "→ Done. URL : terraform output -raw website_url (puis /api/healthz)"

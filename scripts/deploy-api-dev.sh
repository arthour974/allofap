#!/usr/bin/env bash
# Déploie l'image API sur ECR dev et redémarre ECS.
# Prérequis : Docker Desktop démarré, AWS CLI configuré.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REGION="${AWS_REGION:-us-west-2}"
ECR="503789396714.dkr.ecr.us-west-2.amazonaws.com/allofap-dev-api"
TAG="${1:-latest}"

cd "$ROOT"

echo "→ Login ECR"
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "${ECR%%/*}"

echo "→ Build image"
docker build -t "$ECR:$TAG" .

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

echo "→ Done. Test: curl https://d1ng31qot2lqlk.cloudfront.net/api/healthz"

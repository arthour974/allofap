#!/usr/bin/env bash
# Déploie l'image API sur ECR prod et redémarre ECS.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REGION="${AWS_REGION:-eu-west-3}"
ACCOUNT_ID="${AWS_ACCOUNT_ID:-503789396714}"
REPO_NAME="allofap-prod-api"
ECR="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}"
TAG="${1:-latest}"

cd "$ROOT"
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
docker build --platform linux/amd64 -t "$ECR:$TAG" .
docker push "$ECR:$TAG"
cd "$ROOT/infra/environments/prod"
terraform apply -auto-approve -var="api_image_tag=$TAG"
aws ecs update-service --cluster allofap-prod --service allofap-prod-api --force-new-deployment --region "$REGION"
echo "→ Test: curl \$(terraform output -raw website_url)/api/healthz"

#!/usr/bin/env bash
# Migration prod Oregon → Paris (eu-west-3). Exécution non interactive.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TF_DIR="$ROOT/infra/environments/prod"
LOG="$ROOT/migrate-prod-paris.log"
REGION_OLD=us-west-2
REGION_NEW=eu-west-3

exec > >(tee -a "$LOG") 2>&1
echo "=== Migration prod → Paris $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

cd "$TF_DIR"

echo "→ State rm (ressources régionales)"
for r in \
  module.api.aws_security_group.alb \
  module.api.aws_security_group.ecs \
  module.api.aws_ssm_parameter.database_url \
  module.api.aws_ssm_parameter.session_secret \
  module.api.aws_ssm_parameter.shopify_webhook_secret \
  module.frontend.data.aws_iam_policy_document.s3_policy \
  module.frontend.aws_cloudfront_distribution.frontend \
  module.frontend.aws_cloudfront_origin_access_control.frontend \
  module.frontend.aws_s3_bucket.frontend \
  module.frontend.aws_s3_bucket_policy.frontend \
  module.frontend.aws_s3_bucket_public_access_block.frontend \
  module.frontend.aws_s3_bucket_versioning.frontend
do
  terraform state rm "$r" 2>/dev/null || true
done

echo "→ Sauvegarde secrets SSM ($REGION_OLD)"
mkdir -p "$ROOT/.migrate-secrets"
for p in DATABASE_URL SESSION_SECRET SHOPIFY_WEBHOOK_SECRET; do
  aws ssm get-parameter \
    --name "/allofap/prod/$p" \
    --with-decryption \
    --region "$REGION_OLD" \
    --query 'Parameter.Value' \
    --output text > "$ROOT/.migrate-secrets/$p"
done

echo "→ Vidage bucket Oregon allofap-prod-frontend"
aws s3 rm "s3://allofap-prod-frontend" --recursive --region "$REGION_OLD" 2>/dev/null || true
aws s3 rb "s3://allofap-prod-frontend" --force --region "$REGION_OLD" 2>/dev/null || true

echo "→ Imports IAM / OAC (si apply partiel précédent)"
terraform import module.api.aws_iam_role.ecs_execution allofap-prod-ecs-execution 2>/dev/null || true
terraform import module.api.aws_iam_role.ecs_task allofap-prod-ecs-task 2>/dev/null || true
OAC_ID=$(aws cloudfront list-origin-access-controls --query "OriginAccessControlList.Items[?Name=='allofap-prod-oac'].Id" --output text 2>/dev/null || true)
[ -n "$OAC_ID" ] && terraform import module.frontend.aws_cloudfront_origin_access_control.frontend "$OAC_ID" 2>/dev/null || true

echo "→ Terraform apply ($REGION_NEW)"
terraform apply -auto-approve -input=false -var="api_image_tag=latest"

echo "→ Restauration secrets SSM ($REGION_NEW)"
for p in DATABASE_URL SESSION_SECRET SHOPIFY_WEBHOOK_SECRET; do
  aws ssm put-parameter \
    --name "/allofap/prod/$p" \
    --value "file://$ROOT/.migrate-secrets/$p" \
    --type SecureString \
    --overwrite \
    --region "$REGION_NEW"
done
rm -rf "$ROOT/.migrate-secrets"

echo "→ Outputs"
terraform output -json | jq -r 'to_entries[] | "\(.key)=\(.value.value)"'

echo "=== Migration Terraform terminée ==="

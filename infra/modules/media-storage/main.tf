# -----------------------------------------------------------------------------
# Module media-storage — photos et vidéos des interventions
# -----------------------------------------------------------------------------
# Crée un bucket S3 dédié aux médias d'intervention :
# - Chemin des objets : interventions/{id_intervention}/{fichier}
# - Lecture publique (GetObject) sur interventions/* pour partager les URLs aux clients
# - Chiffrement, versioning et CORS (GET/HEAD) pour affichage dans le navigateur
# L'API ECS reçoit les droits d'écriture via le module api-ecs (variable enable_media_bucket).
# -----------------------------------------------------------------------------

resource "aws_s3_bucket" "medias" {
  # Suffixe euw3 : noms S3 globaux ; après suppression en us-west-2, la réutilisation du même nom peut bloquer 30+ min
  bucket = "${var.project_name}-${var.environment}-medias-euw3"

  tags = var.tags
}

# Autorise une bucket policy publique sur le préfixe interventions/* tout en bloquant les ACLs publiques.
resource "aws_s3_bucket_public_access_block" "medias" {
  bucket = aws_s3_bucket.medias.id

  block_public_acls       = true
  block_public_policy     = false
  ignore_public_acls      = true
  restrict_public_buckets = false
}

resource "aws_s3_bucket_versioning" "medias" {
  bucket = aws_s3_bucket.medias.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "medias" {
  bucket = aws_s3_bucket.medias.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "medias" {
  bucket = aws_s3_bucket.medias.id

  cors_rule {
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    allowed_headers = ["*"]
    max_age_seconds = 3600
  }
}

# Lecture anonyme limitée aux fichiers sous interventions/ (URLs partageables).
data "aws_iam_policy_document" "public_read" {
  statement {
    sid    = "PublicReadInterventions"
    effect = "Allow"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions = [
      "s3:GetObject",
    ]

    resources = [
      "${aws_s3_bucket.medias.arn}/interventions/*",
    ]
  }
}

resource "aws_s3_bucket_policy" "medias" {
  bucket = aws_s3_bucket.medias.id
  policy = data.aws_iam_policy_document.public_read.json

  depends_on = [aws_s3_bucket_public_access_block.medias]
}

output "bucket_name" {
  description = "Nom du bucket S3 (ex. allofap-dev-medias). À passer en MEDIA_S3_BUCKET côté API."
  value       = aws_s3_bucket.medias.id
}

output "bucket_arn" {
  description = "ARN complet du bucket, pour policies IAM ou références Terraform."
  value       = aws_s3_bucket.medias.arn
}

output "public_url_prefix" {
  description = "Préfixe HTTPS des URLs publiques des objets (domaine régional S3 + pas de chemin fichier)."
  value       = "https://${aws_s3_bucket.medias.bucket_regional_domain_name}"
}

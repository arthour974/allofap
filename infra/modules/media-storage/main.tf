resource "aws_s3_bucket" "medias" {
  bucket = "${var.project_name}-${var.environment}-medias"

  tags = var.tags
}

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
  value = aws_s3_bucket.medias.id
}

output "bucket_arn" {
  value = aws_s3_bucket.medias.arn
}

output "public_url_prefix" {
  value = "https://${aws_s3_bucket.medias.bucket_regional_domain_name}"
}

# =============================================================================
# Environnement PROD — allofap
# =============================================================================
# Même architecture que dev avec ressources dimensionnées pour la prod :
# médias S3, API ECS Fargate, front S3+CloudFront, OIDC GitHub.
# Branche de déploiement : main. Secrets : SSM /allofap/prod/*
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {}
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

locals {
  medias_bucket_name = "${var.project_name}-${var.environment}-medias-euw3"
  medias_bucket_arn  = "arn:aws:s3:::${local.medias_bucket_name}"
}

module "media_storage" {
  source = "../../modules/media-storage"

  project_name = var.project_name
  environment  = var.environment
}

module "api" {
  source = "../../modules/api-ecs"

  project_name        = var.project_name
  environment         = var.environment
  aws_region          = var.aws_region
  api_image_tag       = var.api_image_tag
  task_cpu            = var.task_cpu
  task_memory         = var.task_memory
  desired_count       = var.desired_count
  allowed_origins     = var.allowed_origins
  log_retention_days  = 30
  enable_media_bucket = true
  media_bucket_name   = local.medias_bucket_name
  media_bucket_arn    = local.medias_bucket_arn
}

module "frontend" {
  source = "../../modules/static-frontend"

  project_name      = var.project_name
  environment       = var.environment
  api_origin_domain = module.api.alb_dns_name
}

module "github_oidc" {
  source = "../../modules/github-oidc"

  project_name           = var.project_name
  environment            = var.environment
  aws_region             = var.aws_region
  github_repository      = var.github_repository
  allowed_branch         = var.github_allowed_branch
  github_environment     = "production"
  terraform_state_bucket = var.terraform_state_bucket
  terraform_lock_table   = var.terraform_lock_table
}

output "website_url" {
  description = "URL HTTPS du site en production (CloudFront)."
  value       = module.frontend.website_url
}

output "cloudfront_distribution_id" {
  description = "ID pour invalider le cache CloudFront après deploy front."
  value       = module.frontend.cloudfront_distribution_id
}

output "frontend_bucket" {
  description = "Bucket S3 cible du sync du build frontend prod."
  value       = module.frontend.bucket_name
}

output "ecr_repository_url" {
  description = "Registre Docker pour l'image API prod."
  value       = module.api.ecr_repository_url
}

output "github_actions_role_arn" {
  description = "ARN du rôle OIDC GitHub (environnement production)."
  value       = module.github_oidc.role_arn
}

output "ecs_cluster" {
  description = "Cluster ECS prod."
  value       = module.api.ecs_cluster_name
}

output "ecs_service" {
  description = "Service ECS API prod."
  value       = module.api.ecs_service_name
}

output "medias_bucket" {
  description = "Bucket des photos d'intervention prod (allofap-prod-medias)."
  value       = module.media_storage.bucket_name
}

output "medias_public_url_prefix" {
  description = "Préfixe HTTPS des URLs publiques des médias en prod."
  value       = module.media_storage.public_url_prefix
}

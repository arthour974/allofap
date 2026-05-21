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

module "media_storage" {
  source = "../../modules/media-storage"

  project_name = var.project_name
  environment  = var.environment
}

module "api" {
  source = "../../modules/api-ecs"

  project_name       = var.project_name
  environment        = var.environment
  aws_region         = var.aws_region
  api_image_tag      = var.api_image_tag
  task_cpu           = var.task_cpu
  task_memory        = var.task_memory
  desired_count      = var.desired_count
  allowed_origins    = var.allowed_origins
  log_retention_days = 30
  media_bucket_name  = module.media_storage.bucket_name
  media_bucket_arn   = module.media_storage.bucket_arn
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
  value = module.frontend.website_url
}

output "cloudfront_distribution_id" {
  value = module.frontend.cloudfront_distribution_id
}

output "frontend_bucket" {
  value = module.frontend.bucket_name
}

output "ecr_repository_url" {
  value = module.api.ecr_repository_url
}

output "github_actions_role_arn" {
  value = module.github_oidc.role_arn
}

output "ecs_cluster" {
  value = module.api.ecs_cluster_name
}

output "ecs_service" {
  value = module.api.ecs_service_name
}

output "medias_bucket" {
  value = module.media_storage.bucket_name
}

output "medias_public_url_prefix" {
  value = module.media_storage.public_url_prefix
}

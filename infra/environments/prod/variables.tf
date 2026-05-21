variable "project_name" {
  type        = string
  default     = "allofap"
  description = "Préfixe global des ressources AWS (allofap-dev-*, allofap-prod-*)."
}

variable "environment" {
  type        = string
  default     = "prod"
  description = "Environnement production ; paramètres SSM sous /allofap/prod/."
}

variable "aws_region" {
  type        = string
  default     = "eu-west-3"
  description = "Région de déploiement AWS (Paris = eu-west-3) : ECS, S3, ALB, ECR, etc."
}

variable "api_image_tag" {
  type        = string
  default     = "latest"
  description = "Tag Docker déployé sur ECS prod (recommandé : SHA de commit tagué)."
}

variable "task_cpu" {
  type        = string
  default     = "512"
  description = "CPU Fargate API en prod (plus de marge qu'en dev)."
}

variable "task_memory" {
  type        = string
  default     = "1024"
  description = "Mémoire (Mo) de la task Fargate API en prod."
}

variable "desired_count" {
  type        = number
  default     = 1
  description = "Nombre de tasks API en prod (augmenter pour la haute dispo)."
}

variable "github_repository" {
  type        = string
  description = "Dépôt GitHub au format owner/repo pour OIDC et déploiements CI."
}

variable "github_allowed_branch" {
  type        = string
  default     = "main"
  description = "Seule la branche main peut déployer en production."
}

variable "terraform_state_bucket" {
  type        = string
  description = "Bucket du backend Terraform (créé par infra/bootstrap)."
}

variable "terraform_lock_table" {
  type        = string
  description = "Table DynamoDB de verrouillage Terraform."
}

variable "allowed_origins" {
  type        = string
  default     = ""
  description = "Origines CORS autorisées par l'API (URL CloudFront prod, séparées par des virgules si plusieurs)."
}

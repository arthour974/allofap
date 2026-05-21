variable "project_name" {
  type        = string
  default     = "allofap"
  description = "Préfixe global des ressources AWS (allofap-dev-*, allofap-prod-*)."
}

variable "environment" {
  type        = string
  default     = "dev"
  description = "Nom d'environnement logique ; doit correspondre au dossier et aux paramètres SSM /allofap/dev/."
}

variable "aws_region" {
  type        = string
  default     = "eu-west-3"
  description = "Région de déploiement AWS (Paris = eu-west-3) : ECS, S3, ALB, ECR, etc."
}

variable "api_image_tag" {
  type        = string
  default     = "latest"
  description = "Tag Docker déployé sur ECS (souvent le SHA du commit ou latest en dev)."
}

variable "task_cpu" {
  type        = string
  default     = "256"
  description = "CPU alloué à la task Fargate API en dev (coût réduit)."
}

variable "task_memory" {
  type        = string
  default     = "512"
  description = "Mémoire (Mo) de la task Fargate API en dev."
}

variable "desired_count" {
  type        = number
  default     = 1
  description = "Nombre de réplicas API en dev (généralement 1)."
}

variable "github_repository" {
  type        = string
  description = "Dépôt GitHub au format owner/repo pour OIDC et déploiements CI."
}

variable "github_allowed_branch" {
  type        = string
  default     = "develop"
  description = "Seule cette branche peut déployer en dev via GitHub Actions."
}

variable "terraform_state_bucket" {
  type        = string
  description = "Bucket du backend Terraform (créé par infra/bootstrap)."
}

variable "terraform_lock_table" {
  type        = string
  description = "Table DynamoDB de verrouillage Terraform (créée par infra/bootstrap)."
}

variable "allowed_origins" {
  type        = string
  default     = ""
  description = "Origines CORS de l'API. Vide = comportement par défaut ; sinon URL CloudFront (https://xxx.cloudfront.net)."
}

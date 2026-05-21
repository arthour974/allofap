variable "project_name" {
  type        = string
  description = "Préfixe du projet pour le rôle IAM GitHub Actions."
}

variable "environment" {
  type        = string
  description = "Environnement (dev, prod) — isole les rôles et policies par env."
}

variable "aws_region" {
  type        = string
  description = "Région AWS ciblée par les déploiements CI (ECR, ECS, S3, CloudFront)."
}

variable "github_repository" {
  type        = string
  description = "Dépôt GitHub autorisé au format owner/repo (ex. arthour974/allofap)."
}

variable "allowed_branch" {
  type        = string
  description = "Branche Git autorisée à assumer le rôle (develop pour dev, main pour prod)."
}

variable "github_environment" {
  type        = string
  description = "Nom de l'environnement GitHub (development / production) pour restreindre OIDC."
}

variable "terraform_state_bucket" {
  type        = string
  description = "Bucket S3 du state Terraform — le rôle CI peut lire/écrire le state."
}

variable "terraform_lock_table" {
  type        = string
  description = "Table DynamoDB des verrous Terraform (terraform apply en CI)."
}

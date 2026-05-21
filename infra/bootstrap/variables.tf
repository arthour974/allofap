variable "project_name" {
  type        = string
  default     = "allofap"
  description = "Préfixe utilisé pour le bucket de state Terraform et la table de verrous."
}

variable "aws_region" {
  type        = string
  default     = "eu-west-3"
  description = "Région AWS (Paris = eu-west-3) pour le bootstrap state et OIDC GitHub (une fois par compte)."
}

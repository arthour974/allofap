variable "project_name" {
  type        = string
  description = "Préfixe du projet pour le bucket S3 front et la distribution CloudFront."
}

variable "environment" {
  type        = string
  description = "Environnement (dev, prod)."
}

variable "api_origin_domain" {
  type        = string
  description = "Nom DNS de l'ALB API : CloudFront proxy /api/* vers cette origine (même domaine = cookies session)."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Tags AWS optionnels sur les ressources front."
}

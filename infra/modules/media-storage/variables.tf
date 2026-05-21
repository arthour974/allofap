variable "project_name" {
  type        = string
  description = "Préfixe du projet (ex. allofap), utilisé dans le nom du bucket S3."
}

variable "environment" {
  type        = string
  description = "Environnement cible (dev, prod). Le bucket sera nommé {project_name}-{environment}-medias."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Tags AWS supplémentaires appliqués au bucket médias."
}

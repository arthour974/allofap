variable "project_name" {
  type        = string
  description = "Préfixe du projet pour nommer ECR, ECS, ALB, SSM, etc."
}

variable "environment" {
  type        = string
  description = "Environnement (dev, prod)."
}

variable "aws_region" {
  type        = string
  description = "Région AWS (Paris = eu-west-3), injectée dans la task ECS comme AWS_REGION."
}

variable "container_port" {
  type        = number
  default     = 8080
  description = "Port HTTP exposé par le conteneur Node.js sur la task Fargate."
}

variable "task_cpu" {
  type        = string
  default     = "256"
  description = "CPU Fargate en unités AWS (256 = 0,25 vCPU)."
}

variable "task_memory" {
  type        = string
  default     = "512"
  description = "Mémoire Fargate en Mo pour la task API."
}

variable "desired_count" {
  type        = number
  default     = 1
  description = "Nombre de tasks ECS Fargate à maintenir en service."
}

variable "api_image_tag" {
  type        = string
  default     = "latest"
  description = "Tag de l'image Docker dans ECR (commit SHA ou latest)."
}

variable "allowed_origins" {
  type        = string
  description = "Origines CORS autorisées par l'API, séparées par des virgules (URL CloudFront du front)."
}

variable "log_retention_days" {
  type        = number
  default     = 14
  description = "Durée de rétention des logs CloudWatch du conteneur API (/ecs/...)."
}

variable "enable_media_bucket" {
  type        = bool
  default     = false
  description = "Si true : policy IAM S3 sur la task ECS + variable d'environnement MEDIA_S3_BUCKET."
}

variable "media_bucket_name" {
  type        = string
  default     = ""
  description = "Nom du bucket médias (doit correspondre au module media-storage). Utilisé sans dépendre d'un apply S3."
}

variable "media_bucket_arn" {
  type        = string
  default     = ""
  description = "ARN du bucket médias pour PutObject/GetObject/DeleteObject sur interventions/*."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Tags AWS optionnels sur les ressources du module."
}

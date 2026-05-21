variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "container_port" {
  type    = number
  default = 8080
}

variable "task_cpu" {
  type    = string
  default = "256"
}

variable "task_memory" {
  type    = string
  default = "512"
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "api_image_tag" {
  type    = string
  default = "latest"
}

variable "allowed_origins" {
  type        = string
  description = "Comma-separated CORS origins (CloudFront URL)"
}

variable "log_retention_days" {
  type    = number
  default = 14
}

variable "media_bucket_name" {
  type        = string
  default     = ""
  description = "Bucket S3 pour les photos/médias d'intervention"
}

variable "media_bucket_arn" {
  type        = string
  default     = ""
  description = "ARN du bucket médias (permissions ECS task)"
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "project_name" {
  type    = string
  default = "allofap"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "aws_region" {
  type    = string
  default = "us-west-2"
}

variable "api_image_tag" {
  type    = string
  default = "latest"
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

variable "github_repository" {
  type        = string
  description = "owner/repo GitHub"
}

variable "github_allowed_branch" {
  type    = string
  default = "develop"
}

variable "terraform_state_bucket" {
  type = string
}

variable "terraform_lock_table" {
  type = string
}

variable "allowed_origins" {
  type        = string
  default     = ""
  description = "Optionnel : https://xxx.cloudfront.net (sinon *.cloudfront.net accepté par l'API)"
}

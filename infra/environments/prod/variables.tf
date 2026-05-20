variable "project_name" {
  type    = string
  default = "allofap"
}

variable "environment" {
  type    = string
  default = "prod"
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
  default = "512"
}

variable "task_memory" {
  type    = string
  default = "1024"
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "github_repository" {
  type = string
}

variable "github_allowed_branch" {
  type    = string
  default = "main"
}

variable "terraform_state_bucket" {
  type = string
}

variable "terraform_lock_table" {
  type = string
}

variable "allowed_origins" {
  type    = string
  default = ""
}

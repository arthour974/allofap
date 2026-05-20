variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "github_repository" {
  type        = string
  description = "Format: owner/repo (ex: mon-org/allofap)"
}

variable "allowed_branch" {
  type        = string
  description = "Branch allowed to assume this role (develop for dev, main for prod)"
}

variable "github_environment" {
  type        = string
  description = "GitHub Environment name matching GitHub Settings"
}

variable "terraform_state_bucket" {
  type = string
}

variable "terraform_lock_table" {
  type = string
}

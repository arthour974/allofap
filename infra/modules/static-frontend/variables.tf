variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "api_origin_domain" {
  type        = string
  description = "ALB DNS name (HTTP) for /api/* origin"
}

variable "tags" {
  type    = map(string)
  default = {}
}

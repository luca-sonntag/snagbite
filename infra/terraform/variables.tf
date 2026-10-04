variable "railway_token" {
  description = "Railway API token used to authenticate terraform"
  type        = string
  sensitive   = true
  default     = null
}

variable "project_id" {
  description = "Existing Railway project ID"
  type        = string
  default     = "eaefc4e6-e615-478c-b265-016e9f0062c7"
}

variable "environment_id" {
  description = "Existing Railway environment ID"
  type        = string
  default     = null
}

variable "project_name" {
  description = "Name of the Railway project"
  type        = string
  default     = "snagbite"
}

variable "environment_name" {
  description = "Railway environment name (production or development)"
  type        = string
  default     = "production"
}

variable "backend_service_id" {
  description = "Existing Backend service ID"
  type        = string
  default     = null
}

variable "github_repo" {
  description = "GitHub repository backing the services"
  type        = string
  default     = "luca-sonntag/cookbook"
}

variable "branch_name" {
  description = "Git branch to deploy for this environment"
  type        = string
  default     = "master"
}

variable "postgres_volume_size_gb" {
  description = "Size of the persistent volume attached to PostgreSQL in GB"
  type        = number
  default     = 10
}

output "project_id" {
  description = "Railway Project ID"
  value       = local.project_id
}

output "environment_id" {
  description = "Railway Environment ID"
  value       = local.environment_id
}

output "postgres_service_id" {
  description = "PostgreSQL Service ID"
  value       = railway_service.postgres.id
}

output "storage_service_id" {
  description = "Storage Service ID"
  value       = railway_service.storage.id
}

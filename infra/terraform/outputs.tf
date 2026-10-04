output "project_id" {
  description = "Railway Project ID"
  value       = railway_project.main.id
}

output "environment_id" {
  description = "Railway Environment ID"
  value       = railway_environment.env.id
}

output "postgres_service_id" {
  description = "PostgreSQL Service ID"
  value       = railway_service.postgres.id
}

output "storage_service_id" {
  description = "Storage Service ID"
  value       = railway_service.storage.id
}

output "backend_web_service_id" {
  description = "Backend Web API Service ID"
  value       = railway_service.backend_web.id
}

output "backend_worker_service_id" {
  description = "Backend Worker Service ID"
  value       = railway_service.backend_worker.id
}

output "healthcheck_service_id" {
  description = "Healthcheck Service ID"
  value       = railway_service.healthcheck.id
}

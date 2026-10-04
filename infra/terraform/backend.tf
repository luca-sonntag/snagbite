# 1. API Web Service
resource "railway_service" "backend_web" {
  project_id = railway_project.main.id
  name       = "backend-web"
}

resource "railway_variable" "backend_web_role" {
  environment_id = railway_environment.env.id
  service_id     = railway_service.backend_web.id
  name           = "ROLE"
  value          = "web"
}

resource "railway_variable" "backend_web_port" {
  environment_id = railway_environment.env.id
  service_id     = railway_service.backend_web.id
  name           = "PORT"
  value          = "3000"
}

resource "railway_variable" "backend_web_db" {
  environment_id = railway_environment.env.id
  service_id     = railway_service.backend_web.id
  name           = "DATABASE_URL"
  value          = "$${{postgres.DATABASE_URL}}"
}

resource "railway_variable" "backend_web_storage_endpoint" {
  environment_id = railway_environment.env.id
  service_id     = railway_service.backend_web.id
  name           = "S3_ENDPOINT"
  value          = "$${{storage.S3_ENDPOINT}}"
}

# 2. Asynchronous Queue Worker Service
resource "railway_service" "backend_worker" {
  project_id = railway_project.main.id
  name       = "backend-worker"
}

resource "railway_variable" "backend_worker_role" {
  environment_id = railway_environment.env.id
  service_id     = railway_service.backend_worker.id
  name           = "ROLE"
  value          = "worker"
}

resource "railway_variable" "backend_worker_db" {
  environment_id = railway_environment.env.id
  service_id     = railway_service.backend_worker.id
  name           = "DATABASE_URL"
  value          = "$${{postgres.DATABASE_URL}}"
}

resource "railway_variable" "backend_worker_storage_endpoint" {
  environment_id = railway_environment.env.id
  service_id     = railway_service.backend_worker.id
  name           = "S3_ENDPOINT"
  value          = "$${{storage.S3_ENDPOINT}}"
}

# 3. Healthcheck Monitoring Service
resource "railway_service" "healthcheck" {
  project_id = railway_project.main.id
  name       = "healthcheck"
}

resource "railway_variable" "healthcheck_db" {
  environment_id = railway_environment.env.id
  service_id     = railway_service.healthcheck.id
  name           = "DATABASE_URL"
  value          = "$${{postgres.DATABASE_URL}}"
}

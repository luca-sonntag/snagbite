# Connect S3 storage and Postgres to the existing backend service
resource "railway_variable" "backend_db_url" {
  count          = var.backend_service_id != null ? 1 : 0
  environment_id = local.environment_id
  service_id     = var.backend_service_id
  name           = "DATABASE_URL"
  value          = "postgresql://postgres:snagbite_dev_secret_2026@$${{postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/snagbite"
}

resource "railway_variable" "backend_s3_endpoint" {
  count          = var.backend_service_id != null ? 1 : 0
  environment_id = local.environment_id
  service_id     = var.backend_service_id
  name           = "S3_ENDPOINT"
  value          = "http://$${{storage.RAILWAY_PRIVATE_DOMAIN}}:9000"
}

resource "railway_variable" "backend_s3_key" {
  count          = var.backend_service_id != null ? 1 : 0
  environment_id = local.environment_id
  service_id     = var.backend_service_id
  name           = "S3_ACCESS_KEY_ID"
  value          = "$${{storage.MINIO_ROOT_USER}}"
}

resource "railway_variable" "backend_s3_secret" {
  count          = var.backend_service_id != null ? 1 : 0
  environment_id = local.environment_id
  service_id     = var.backend_service_id
  name           = "S3_SECRET_ACCESS_KEY"
  value          = "$${{storage.MINIO_ROOT_PASSWORD}}"
}

resource "railway_variable" "backend_s3_force_path_style" {
  count          = var.backend_service_id != null ? 1 : 0
  environment_id = local.environment_id
  service_id     = var.backend_service_id
  name           = "S3_FORCE_PATH_STYLE"
  value          = "true"
}

resource "railway_service" "postgres" {
  project_id   = local.project_id
  name         = "postgres"
  source_image = "postgres:16-alpine"

  volume = {
    name       = "postgres-data"
    mount_path = "/var/lib/postgresql/data"
  }
}

resource "railway_variable" "postgres_user" {
  environment_id = local.environment_id
  service_id     = railway_service.postgres.id
  name           = "POSTGRES_USER"
  value          = "postgres"
}

resource "railway_variable" "postgres_db" {
  environment_id = local.environment_id
  service_id     = railway_service.postgres.id
  name           = "POSTGRES_DB"
  value          = "snagbite"
}

resource "railway_variable" "postgres_password" {
  environment_id = local.environment_id
  service_id     = railway_service.postgres.id
  name           = "POSTGRES_PASSWORD"
  value          = "snagbite_dev_secret_2026"
}

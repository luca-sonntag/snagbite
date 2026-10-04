resource "railway_service" "postgres" {
  project_id = railway_project.main.id
  name       = "postgres"
}

resource "railway_volume" "postgres_data" {
  project_id     = railway_project.main.id
  environment_id = railway_environment.env.id
  service_id     = railway_service.postgres.id
  name           = "postgres-data"
}

resource "railway_variable" "postgres_user" {
  environment_id = railway_environment.env.id
  service_id     = railway_service.postgres.id
  name           = "POSTGRES_USER"
  value          = "postgres"
}

resource "railway_variable" "postgres_db" {
  environment_id = railway_environment.env.id
  service_id     = railway_service.postgres.id
  name           = "POSTGRES_DB"
  value          = "railway"
}

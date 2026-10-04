resource "railway_project" "main" {
  name        = var.project_name
  description = "Snagbite Recipe App Infrastructure"
}

resource "railway_environment" "env" {
  project_id = railway_project.main.id
  name       = var.environment_name
}

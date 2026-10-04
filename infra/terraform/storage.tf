# S3-compatible Object Storage Service
resource "railway_service" "storage" {
  project_id = railway_project.main.id
  name       = "storage"
}

# The 5 active buckets managed in Snagbite:
# - recipe-covers (public)
# - app-bundles (public for Capgo OTA)
# - feedback-screenshots (private, presigned)
# - recipe-photos (private, backend-only)
# - cook-photos (private, backend-only)
resource "railway_variable" "storage_active_buckets" {
  environment_id = railway_environment.env.id
  service_id     = railway_service.storage.id
  name           = "ACTIVE_BUCKETS"
  value          = "recipe-covers,app-bundles,feedback-screenshots,recipe-photos,cook-photos"
}

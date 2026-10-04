import {
  to = railway_service.storage
  id = "5e90aa0f-b72f-441c-9a06-01fab85580bb"
}

resource "railway_service" "storage" {
  project_id   = local.project_id
  name         = "storage"
  source_image = "minio/minio:latest"

  volume = {
    name       = "storage-volume"
    mount_path = "/data"
  }

  lifecycle {
    ignore_changes = [volume]
  }
}

resource "railway_variable" "storage_root_user" {
  environment_id = local.environment_id
  service_id     = railway_service.storage.id
  name           = "MINIO_ROOT_USER"
  value          = "snagbite_admin"
}

resource "railway_variable" "storage_root_password" {
  environment_id = local.environment_id
  service_id     = railway_service.storage.id
  name           = "MINIO_ROOT_PASSWORD"
  value          = "snagbite_storage_secret_2026"
}

# The 5 active buckets managed in Snagbite:
# - recipe-covers (public)
# - app-bundles (public for Capgo OTA)
# - feedback-screenshots (private, presigned)
# - recipe-photos (private, backend-only)
# - cook-photos (private, backend-only)
resource "railway_variable" "storage_active_buckets" {
  environment_id = local.environment_id
  service_id     = railway_service.storage.id
  name           = "ACTIVE_BUCKETS"
  value          = "recipe-covers,app-bundles,feedback-screenshots,recipe-photos,cook-photos"
}

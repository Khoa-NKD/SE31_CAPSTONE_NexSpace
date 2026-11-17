# Cloudinary document storage and retention

Active organizer files use authenticated Cloudinary storage in Organizers/{organizerProfileId}/doc with generated UUID names. The SDK sets both public_id and asset_folder. Public workspace media behavior is unchanged. Images use signed CDN reads; raw PDFs use the signed, short-lived private download API on api.cloudinary.com. Signed URLs and provider credentials never enter frontend DTOs or logs.

A replacement validates ownership, permitted document type, requested-change status and reviewed revision under the existing profile lock. The new file is stored first; the old row becomes is_current=false/status=REPLACED and a new PENDING current row is created. Rollback compensates the new file only. Commit triggers deletion of the old physical asset. If cleanup fails, its record/reference is retained and a sanitized ID-only message indicates pending cleanup. Admin views show historical metadata rather than a download action for REPLACED rows.

The explicit maintenance command scripts/MigrateOrganizerDocuments.java reads configuration locally. Its default mode makes no metadata changes. --apply migrates active assets after comparing downloaded bytes, updates only file_url, commits, and then removes unreferenced sources. Noncurrent records become REPLACED and their obsolete physical assets are removed. Re-running the command skips assets already in their profile folder and retries obsolete asset cleanup. Stop the backend during maintenance. Never run the command as an automatic startup seed or migration.

The authorized Local rollout on 2026-11-05 verified 17 active files in their profile folders and retained 3 replaced metadata rows. Profile review states, roles, ownership and document IDs were preserved. No schema change was required because organizer_document.status is VARCHAR(20).

Tests use provider mocks, temporary files and isolated H2. Local properties, credentials and target build/runtime files must stay ignored by Git.

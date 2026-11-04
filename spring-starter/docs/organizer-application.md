# Initial organizer application

## Scope and decisions

This implementation uses the approved current Java 17 / Long ID / Bearer JWT baseline. It reuses `organizer_profile` and `organizer_document` without DDL changes. An authenticated, active, email-verified USER or ORGANIZER can make an initial submission. Submission leaves the account role unchanged and records `PENDING_REVIEW` with a UTC submission timestamp. Banking information is not collected.

The supported business types are `JOINT_STOCK`, `LIMITED_LIABILITY`, `SOLE_PROPRIETOR`, `HOUSEHOLD_BUSINESS`, and `OTHER` (other business). All require legal name, business type, tax ID, representative name, address, contact phone, contact email and a business license. `INDIVIDUAL` remains unsupported pending a separate schema/enum decision; it is not mapped to `OTHER`.

An existing organizer profile in any status returns 409. This endpoint does not modify drafts or implement resubmission. An approved organizer's tax ID cannot be reused. Submission does not implement approval, rejection, document management, or workspace publication.

## API contract

`POST /api/organizer/applications`, authenticated with `Authorization: Bearer ...`.

Content type: `multipart/form-data` with these required parts:

- `application`: `application/json`, containing `legalName` (1–255), `businessType`, `taxId` (1–50), `representativeName` (1–100), `address` (1–500), `contactPhone` (8–20, digits and `+() .-`), and `contactEmail` (email, maximum 255). Strings are trimmed before validation. Actor identity comes exclusively from the authenticated principal.
- `businessLicense`: one nonempty JPG, JPEG, PNG or PDF, at most 5 MiB. Extension, declared MIME type, file signature, and safe filename are checked. These checks do not replace administrator document review or malware scanning.

Success: HTTP 201, existing envelope `{ success, data: { id, status, submittedAt }, message, statusCode }`. `submittedAt` is an ISO local date/time interpreted as UTC. No document path, file bytes or account credentials are returned.

Errors use the existing envelope and HTTP statuses: 400 for invalid fields/parts/files, 401 for missing/invalid authentication, 403 for ineligible accounts/roles, 409 for existing profiles or approved tax ID conflicts, 413 for multipart limits, and 415 for unsupported request media types. Bean Validation errors use the `errors` field map.

The user's row is locked inside the submission transaction before checking for an existing profile; the existing unique organizer foreign key is an additional constraint. The profile and document metadata are flushed within that transaction. Confirmed transaction rollback removes the newly written file. An indeterminate commit result or process crash can leave an orphan file; automatic deletion in that case could destroy a committed document, so operational reconciliation remains necessary.

## Local configuration and private files

The user-supplied file belongs at `src/main/resources/application-local.properties`. The existing tracked `.gitignore` ignores this exact filename. The Maven JAR plugin excludes it from packaged artifacts. It remains available on the local development classpath. Do not add its contents or generated artifacts containing credentials to Git.

`application.properties` defaults to profile `local` unless `SPRING_PROFILES_ACTIVE` overrides it. To select it explicitly from this application directory:

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"
```

This is a normal application startup command, not a read-only configuration check. The current baseline uses Hibernate `update` and a startup role initializer, with optional administrator seeding. Run only against a database whose startup effects have been authorized. Configuration integration and automated tests must not use the supplied database for writes.

Set `APP_ORGANIZER_DOCUMENTS_DIRECTORY` to an absolute directory outside the checkout and outside all web/static roots. The default is `${user.home}/.nexspace/organizer-documents`, independent of the source directory. This resolves as `app.organizer.documents-directory`. An explicitly blank or relative setting fails submission without creating a profile. Use a persistent private volume in deployment, restrict Windows directory ACLs to the backend service account, and back it up together with database metadata. On POSIX, files are created with owner-only read/write permission. No static resource mapping or document download endpoint is added.

Only an opaque generated file key is stored in `organizer_document.file_url`; its original filename is metadata. Maximum multipart file/request sizes are 5/20 MiB, preserving the shared workspace upload configuration. Each organizer document remains limited to 5 MiB. The supplied database/JWT values are never included in this document.

## Frontend integration

The application page is `/organizer/apply`; the Customer navbar partner entry links to it. Sign-in uses the existing `/api/auth/login`, and the application page verifies `/api/auth/me` before showing the form. Organizer requests share the upstream Zustand auth store and its localStorage persistence; the earlier independent tab session is no longer used. Passwords are not stored. A 401 from an Organizer request clears the shared session. The upstream role-based post-login destinations remain unchanged; Customers can open the application through the partner entry on the landing page.

Frontend source is in the separate frontend worktree. Development routes `/api/auth/*` and `/api/organizer/*` to Spring at `http://localhost:8080` by default. Override `VITE_SPRING_API_PROXY_TARGET` for the development proxy. For deployed browsers, set `VITE_BACKEND_API_URL` to a backend base including `/api`, or configure same-origin `/api` reverse proxy routing. Other mock endpoints retain their existing routing.

## Verification boundaries

The frontend uses npm's updated `package-lock.json`. Reproduce installation with `npm ci --legacy-peer-deps`; the pre-existing Zod adapter declares a Zod 3 peer while the application uses Zod 4. Vite 8 and `@tanstack/react-router-ssr-query` replace the incompatible Vite 7 / older Query integration combination. The legacy Bun lockfile was not regenerated. Production build warnings about third-party `use client` directives and bundle sizes remain outside this feature's scope.

Tests use MockMvc, mocked repositories and temporary private directories; they do not authenticate to the supplied local database. Service tests verify pending state, unchanged role, duplicate rejection, account restrictions, metadata and rollback file cleanup. Controller tests exercise the existing security chain and multipart/validation/error contracts. Frontend contract tests exercise the API client with isolated fetch fixtures. A real MySQL concurrency/persistence test and full authenticated browser-to-MySQL flow require a separately confirmed disposable database; none of these unit/contract tests proves that deployed schema or environment.

Observed on 2026-11-03:

- After integrating backend `0d1b758d` and frontend `80e42037`, backend Maven Wrapper `verify`: 70 tests passed, no failures/errors/skips; target release 17, executed on the available JDK 25. The Organizer web slice explicitly uses profile `test` and does not create a JPA context or run initializers.
- Frontend `npm run test:organizer`: 8 contract tests passed, including upstream login/logout token sharing with Organizer submission and registration's explicit username/name fields. Earlier existing `npm run test:client`: 60 checks passed using a temporary mock runtime. Full TypeScript `tsc --noEmit` and production `npm run build` passed after integration.
- Targeted lint and formatting checks cover the feature files. Repository-wide lint was not used as evidence for this change.
- Browser testing used `mock-server/test/organizer-application-ui-fixture.ts`, guarded by `NEXSPACE_UI_FIXTURE=1`, at localhost port 4087. Vite's Spring proxy pointed only to that fixture. It verified anonymous access, login, required-field/document validation, PDF selection, disabled controls while sending and the success receipt. After integrating upstream Auth, it also verified Customer redirection to the landing page, shared-session access through the partner link after full navigation, and denial after logout. The registration screen showed explicit username/first-name/last-name fields; no account was created through the browser. A double click produced exactly one fixture submission. The fixture stores nothing outside process memory and is never used by application source.
- The supplied Local file matched its original bytes, remained Git-ignored/untracked, and was absent from the packaged JAR. JDBC/MySQL driver and JWT minimum-length checks passed without printing values. TCP connectivity succeeded; database authentication, SQL and schema compatibility were not checked.

Reproduce backend checks from `spring-starter/` with `.\mvnw.cmd -B -ntp verify`. Run frontend checks from the prepared frontend application directory. The Python Playwright/browser prerequisites were unavailable; browser interaction used the available Codex browser tooling instead. Docker was not running, so no disposable MySQL test was performed. No configured/shared database was used for writes.

Task branch verification on 2026-11-04, based on backend `883604a3` and frontend `ae18a067`:

- Backend `.\mvnw.cmd -B -ntp "-Dspring.profiles.active=test" verify`: 166 tests, zero failures, errors or skips; build successful. Tests use mocks, MVC slices and temporary storage, without writing to the configured Local database.
- Frontend: 8 Organizer contract tests and 6 existing role-guard tests passed; `tsc --noEmit`, targeted `oxlint` on task files and `npm run build` passed. Third-party directive and bundle-size warnings remain.
- Upload exception tests preserve HTTP 413 for Organizer submission and the upstream HTTP 400 response for workspace uploads. Login retains upstream role-aware redirects and error notifications, with the existing local duplicate-submit guard.
- Earlier Local startup with Hibernate `validate` succeeded, confirming database authentication and mapped-schema validation at that time. Anonymous GET checks returned 200 for FE/Swagger and 401 for the authentication proxy. This is not evidence of a real database-backed submission or concurrent submission test; those remain unverified.

## Changed files

Backend paths relative to `spring-starter/`:

- `src/main/resources/application-local.properties` (ignored, user-supplied Local configuration).
- `src/main/resources/application.properties` (configurable private storage directory; shared multipart limits are preserved).
- `pom.xml` (exclude Local credentials from the packaged JAR).
- `src/main/java/base/api/feature/auth/repository/IUserRepository.java` (transactional actor row lock).
- `src/main/java/base/api/feature/organizer/repository/IOrganizerDocumentRepository.java` already contains the corrected derived relationship property in upstream; this task does not change it.
- `src/main/java/base/api/feature/organizer/config/OrganizerApplicationConfiguration.java`.
- `src/main/java/base/api/feature/organizer/controller/OrganizerApplicationController.java`.
- `src/main/java/base/api/feature/organizer/dto/request/SubmitOrganizerApplicationRequest.java`.
- `src/main/java/base/api/feature/organizer/dto/response/OrganizerApplicationResponse.java`.
- `src/main/java/base/api/feature/organizer/service/OrganizerApplicationService.java`.
- `src/main/java/base/api/feature/organizer/service/PrivateOrganizerDocumentStorage.java`.
- `src/main/java/base/api/shared/exception/GlobalExceptionHandler.java` (multipart errors).
- `src/test/java/base/api/feature/organizer/controller/OrganizerApplicationControllerTest.java`.
- `src/test/java/base/api/feature/organizer/service/OrganizerApplicationServiceTest.java`.
- `src/test/java/base/api/feature/organizer/service/PrivateOrganizerDocumentStorageTest.java`.
- `src/test/java/base/api/shared/exception/GlobalExceptionHandlerTest.java` (Organizer and workspace upload error contracts).
- `docs/organizer-application.md` (this contract, configuration and verification record).

Frontend paths relative to `.worktrees/frontend/react-stater/`:

- `src/features/auth/api/session.ts`.
- `src/features/auth/api/auth-service.ts` (Spring base URL adaptation for upstream Auth).
- `src/features/auth/store/auth-store.ts` (shared provider import compatible with contract tests).
- `src/features/auth/components/sign-in-form.tsx`.
- `src/features/auth/components/sign-up-form.tsx` (approved minimal registration DTO alignment).
- `src/features/landing/components/navbar.tsx`.
- `src/features/organizer-application/api/application.ts`.
- `src/features/organizer-application/components/application-form.tsx`.
- `src/routes/organizer/apply.tsx`.
- `src/lib/api-client.ts`.
- `src/router.tsx`.
- `vite.config.ts`.
- `package.json` and `package-lock.json`.
- `mock-server/test/organizer-application-contract.test.ts`.
- `mock-server/test/organizer-application-ui-fixture.ts`.

No entities, schema definitions, existing migrations, skills or agent rules were changed. Generated routes were produced by the router plugin, not edited by hand. Local configuration, generated artifacts, skills, and agent rules are excluded from the task commits.

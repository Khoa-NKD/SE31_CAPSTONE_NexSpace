# Update organizer business profile

## Business scope and confirmed decision

SRS Report 3, M03-UC09 / section 3.4.9, describes an approved Organizer updating their business profile. This is separate from M03-UC07 (application edits) and M03-UC08 (resubmission). The detailed SRS field list also contains personal-profile fields and does not define protected legal fields or re-verification behavior.

The user confirmed the following policy on 2026-11-04:

- Only an active, email-verified `ORGANIZER` owning an `APPROVED` organizer profile can read or update this business-profile screen.
- Only `address`, `contactEmail` and `contactPhone` are editable. Legal name, business type, tax ID and legal representative are read-only.
- Approval remains `APPROVED`. Role, ownership, verification documents, review details, submission timestamps and banking data do not change.
- Business description is omitted because the current entity has no such field. No schema or entity changes are introduced.

The current Java 17, Long IDs, Bearer authentication, `/api` prefix and `statusCode` / `errors` envelope are preserved. Account eligibility is checked against current repository data, not only JWT role claims. Hibernate maintains the existing `updatedAt` field. No additional audit/history policy was specified by this use case; no new audit mechanism or history table is added.

## API contract

Both endpoints use `Authorization: Bearer ...` and obtain the actor from the authenticated principal. There is no owner/profile ID parameter for selecting another account's record.

| Method | Endpoint | Result |
| --- | --- | --- |
| GET | `/api/organizer/business-profile` | Current approved business profile, HTTP 200 |
| PUT | `/api/organizer/business-profile` | Replace the three contact fields and return the updated business profile, HTTP 200 |

PUT requires JSON containing all three contact fields:

```json
{
  "address": "123 Example Street",
  "contactEmail": "contact@example.test",
  "contactPhone": "+84901234567"
}
```

Strings are trimmed. Address is required and limited to 500 characters. Contact email is required, must be a valid email and is limited to 255 characters. Contact phone is required and must match `[+0-9() .-]{8,20}`. Unknown and protected fields are rejected with HTTP 400 rather than silently ignored. Empty bodies and missing required fields are invalid. This is a complete contact update, not a partial PATCH operation.

`OrganizerBusinessProfileResponse` contains `id`, `legalName`, `businessType`, `taxId`, `representativeName`, `address`, `contactEmail` and `contactPhone`, inside the existing API envelope. It excludes owner details, bank fields, document paths and review information.

Errors use the existing envelope: 400 for invalid input or disallowed fields, 401 for missing/invalid authentication or a missing account, 403 for incorrect roles, inactive/unverified accounts or foreign ownership, 404 for a missing owned profile, and 409 for any profile state other than `APPROVED`. Bean validation errors retain the `errors` field map. Administrator access is not an exception to ownership or role policy.

Updates acquire a pessimistic write lock on the profile selected by the principal's organizer ID, verify ownership and approval state while locked, and flush changes inside `@Transactional`. Runtime persistence failures roll back the transaction. There is no version column or optimistic conflict token: successive valid contact updates use the last completed write. No schema, migration, application submission or document-storage behavior changes.

## Frontend flow

The Organizer Console has a `Business Profile` navigation item at `/dashboard/organizer/business-profile`. It uses the existing authenticated dashboard, shared UI controls and auth store. Browser-only Query requests use the existing Spring transport/proxy; authenticated requests do not execute during SSR.

The page loads the real GET endpoint, displays four legal identity fields as read-only and pre-fills three editable contact fields. It handles loading, missing/ineligible profiles, validation errors, save errors, success and cancellation. A synchronous ref guard prevents duplicate submissions; inputs and action buttons are disabled during saving. Failed saves retain the draft. Cancel restores the latest loaded/saved contacts.

Query keys contain the account ID. Successful updates replace the current account's cached profile and invalidate only that exact query; another account's cache is not invalidated. Profile queries have zero cache retention after unmount and do not refetch on window focus while the user is editing. Backend authorization remains authoritative even when the frontend has cached account metadata.

## Verification and limits

Verified on 2026-11-04:

- Backend Maven Wrapper `verify` with profile `test`: 201 tests passed, zero failures/errors/skips; build successful. The new service/controller suites contribute 35 tests. Service tests cover eligibility, ownership, approved-only states, immutable legal/system fields and transaction rollback signaling on a persistence failure. MVC tests exercise the security chain, request allowlist, validation and error contracts.
- Frontend contract tests cover real endpoint/method/header shapes through mocked fetch, trimmed contact-only payloads, response mapping, account-scoped cache update/invalidation, failed-save cache preservation and HTTP errors. The existing Organizer submission and role-guard suites are retained as regression checks.
- Production FE build and TypeScript checks passed. Third-party `use client` and bundle-size warnings remain outside this task.
- Browser testing used `organizer-business-profile-ui-fixture.ts`, explicitly enabled with `NEXSPACE_UI_FIXTURE=1`, on localhost port 4088, with a separate Vite instance on port 3011. The fixture stores all writes only in process memory and is not imported by the application. Tests verified loading, pre-filled values, four read-only legal fields, validation, successful saving, disabled controls, one save from a double-click, error draft preservation, cancel, reload, logout protection and layouts at mobile/desktop widths. No console errors were observed during the inspected fixture flow.
- Python/Playwright prerequisites are unavailable, so browser interaction used the existing Codex browser tools. Docker's daemon is unavailable. No real MySQL persistence, lock/concurrency or database rollback test was run, and the configured Local/shared database was not used for test writes. The transaction test verifies the Spring transaction interceptor's rollback call with a fake transaction manager; it is not a database rollback proof.

Reproduce backend checks from `spring-starter/`:

```powershell
.\mvnw.cmd -B -ntp "-Dspring.profiles.active=test" verify
```

From the frontend application, run `npm run test:organizer-profile`, `npm run test:organizer`, the existing role-guard tests, `tsc --noEmit`, targeted `oxlint`, and `npm run build`. Never redirect the browser fixture or automated write tests to the configured Local/shared database. Real persistence testing requires an independently confirmed disposable test database and suitable approved-organizer data. This feature does not implement administrator approval or seed accounts to manufacture that precondition.

## Files changed

Backend paths relative to `spring-starter/`:

- `src/main/java/base/api/feature/organizer/controller/OrganizerBusinessProfileController.java`
- `src/main/java/base/api/feature/organizer/dto/request/UpdateOrganizerBusinessProfileRequest.java`
- `src/main/java/base/api/feature/organizer/dto/response/OrganizerBusinessProfileResponse.java`
- `src/main/java/base/api/feature/organizer/service/OrganizerBusinessProfileService.java`
- `src/main/java/base/api/feature/organizer/repository/IOrganizerProfileRepository.java`
- `src/test/java/base/api/feature/organizer/controller/OrganizerBusinessProfileControllerTest.java`
- `src/test/java/base/api/feature/organizer/service/OrganizerBusinessProfileServiceTest.java`
- `docs/organizer-business-profile.md`

Frontend paths relative to `.worktrees/frontend/react-stater/`:

- `src/features/organizer-business-profile/api/profile.ts`
- `src/features/organizer-business-profile/components/business-profile-view.tsx`
- `src/routes/dashboard/organizer/business-profile.tsx`
- `src/config/nav-config.ts`
- `src/features/auth/api/session.ts` (allows the existing authenticated transport to send PUT)
- `mock-server/test/organizer-business-profile-contract.test.ts`
- `mock-server/test/organizer-business-profile-ui-fixture.ts`
- `package.json` (focused test command only; no dependency changes)

The router plugin generates its ignored route tree; it was not edited manually. Existing user files, local credentials, skills, agent rules and architecture documents remain outside this task. No branch switch, commit or push was performed.

# Bilingual business-type master

business_type stores id, stable unique code, name_vi, name_en, sort_order and existing BaseModel timestamps. The initial catalog contains JOINT_STOCK, LIMITED_LIABILITY, SOLE_PROPRIETOR, HOUSEHOLD_BUSINESS and OTHER with Vietnamese and English labels.

The explicitly authorized Local rollout created the table, inserted the five missing reference rows and added organizer_profile.business_type -> business_type.code. The existing child column and its values were not renamed or rewritten. The code columns use the verified utf8mb4_general_ci collation. The foreign key restricts code changes/deletion while profiles reference them; display-name edits do not affect stored application values.

GET /api/public/business-types returns the existing response envelope with code, nameVi, nameEn and sortOrder for each supported type, ordered by sort order and ID. It is public reference data and introduces no write endpoint or automatic startup seed.

The frontend loads labels from this endpoint and selects nameVi/nameEn through the existing LanguageProvider preference. Application dropdown, approved business-profile display and Admin application list/details use the same catalog. Changing display language never changes the code sent to the backend. Loading failures leave existing form input intact, offer a retry, and prevent saving/submitting until the catalog is available; read-only displays fall back to the stored code.

The existing backend enum and frontend code validation remain the domain allowlist to preserve onboarding/lifecycle rules. This task moves labels into master data; introducing a new semantic business type still requires updating those rules. In particular, INDIVIDUAL is not silently mapped to OTHER.

The reusable rollout SQL is sql/business-type-master.sql. Other environments need their own authorized rollout and matching charset/collation checks. Hibernate startup remains in validation mode. No account, existing profile, document, credential, role or application status was changed by the master rollout.

Verification is limited to the affected public API/label mapping, frontend contract/type/lint checks, and read-only live checks of the five seeded labels and foreign-key consistency. No test account/application is created on the shared database.

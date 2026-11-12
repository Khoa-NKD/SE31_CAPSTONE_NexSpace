# Floor design assistant

The assistant proposes layout data through Gemini. It does not execute SQL, change prices,
publish floors, activate resources or bypass existing booking restrictions.

## Activation

1. Review and explicitly approve migration `V5__floor_design_dimensions_and_library.sql`
   for the intended database before starting the updated backend. Hibernate must use `validate`.
2. Set `GEMINI_API_KEY` in the backend environment or set
   `nexspace.floor-ai.gemini-api-key` in the ignored `application-local.properties`.
   Never put a real key in frontend variables or this document.
3. Optionally set `GEMINI_MODEL`; the configured default is `gemini-3.6-flash`.
   Confirm model access and quota for the project's Google account before live testing.
4. Open Floor Studio, select **AI assistant**, confirm physical floor measurements
   under **Dimensions**, and use **Library** for organizer-owned furnishing presets.

## Persistence and limits

- Geometry remains in the existing resource rows and floor decoration JSON.
- Physical measurements and occupancy limits do not silently rewrite legacy pixel positions.
- Workspace mapped area is calculated from its allocations; declared area is shown for comparison.
- Library presets are copied by value when placed. Archiving a preset preserves placed objects.
- Proposals are private, server-held drafts, expire after 30 minutes and expire on backend restart.
- Five generations per minute and 50 per hour per organizer, one in-flight generation per organizer.
- Apply revalidates scope, ownership, revision, geometry and occupancy. Existing resource services
  enforce booking and deletion rules. Resource and preset changes commit in one transaction.
- Manual preview adjustments are revalidated on the backend; retrying an applied proposal cannot
  create a second copy. Changed apply options require a fresh proposal.
- Proposal caching and generation throttling are local to a backend instance. Multi-instance
  deployment requires shared coordination or a persistent proposal store before scaling.
- No-key mode explicitly reports unconfigured AI. Tests stub the provider; they do not prove
  Gemini access, layout quality or provider data-handling guarantees.

Provider contract: <https://ai.google.dev/api/generate-content> and
<https://ai.google.dev/gemini-api/docs/structured-output>.

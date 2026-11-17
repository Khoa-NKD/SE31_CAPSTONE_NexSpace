import { storage } from '../storage.ts';

async function run(): Promise<void> {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || args.includes('-d');

  console.log('===============================================================');
  console.log(`📦 NexSpace Workspace Schema Migration Tool ${isDryRun ? '(DRY RUN PREVIEW)' : '(EXPLICIT RUN)'}`);
  console.log('===============================================================');

  const inspection = await storage.diagnoseWorkspacesSchema();
  console.log(`Total Workspace records:  ${inspection.totalRecords}`);
  console.log(`Legacy records detected:  ${inspection.legacyRecordsCount}`);
  console.log(`Migration required:       ${inspection.needsMigration ? 'YES' : 'NO'}`);

  for (const diag of inspection.diagnostics) {
    console.log(`ℹ️  ${diag}`);
  }

  if (!inspection.needsMigration) {
    console.log('\n✅ All workspace records adhere to canonical schema. No changes needed.');
    return;
  }

  if (isDryRun) {
    console.log('\n🔍 DRY-RUN PREVIEW COMPLETE.');
    console.log(`Would migrate ${inspection.legacyRecordsCount} record(s) without modifying files.`);
    console.log('To execute the actual migration with timestamped backup, run:');
    console.log('  npm run mock:migrate:workspaces');
    return;
  }

  console.log('\n⏳ Executing explicit migration with atomic write and timestamped backup...');
  const result = await storage.migrateWorkspacesExplicitly({ dryRun: false });

  if (result.backupPath) {
    console.log(`🛡️  Backup created: ${result.backupPath}`);
  }
  console.log(`✨ Successfully migrated ${result.migratedCount} record(s).`);
  console.log('===============================================================');
}

run().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});

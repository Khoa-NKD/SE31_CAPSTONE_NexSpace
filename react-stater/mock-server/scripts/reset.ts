import { storage } from '../storage.ts';

async function main() {
  console.log('🔄 Resetting NexSpace mock runtime data to seed fixtures...');
  try {
    const restored = await storage.resetToSeeds();
    console.log(`✅ Reset complete! Restored ${restored.length} domains:`);
    restored.forEach((f) => console.log(`   - ${f}`));
  } catch (err: unknown) {
    console.error('❌ Failed to reset runtime data:', err);
    process.exit(1);
  }
}

main();

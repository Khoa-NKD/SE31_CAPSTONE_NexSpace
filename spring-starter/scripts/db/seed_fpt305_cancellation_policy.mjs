/** Seed only the approved local workspace policy; existing booking snapshots remain unchanged. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const output = path.join(root, 'artifacts/fpt305-policy-20261119');
function mysql(sql) {
  const result = spawnSync('docker', ['exec', '-i', 'nexspace-mysql', 'sh', '-c',
    'export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"; exec mysql -uroot -N -B --raw nexspace'],
  { input: sql, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  assert.equal(result.status, 0, 'Local policy SQL failed.');
  return result.stdout.trim();
}
assert(mysql('SELECT VERSION();').startsWith('8.4.'));
assert.equal(mysql("SELECT COUNT(*) FROM workspace WHERE id=18 AND organizer_id=1 AND name='FPT305';"), '1');
const snapshots = () => mysql('SELECT id,COALESCE(SHA2(cancellation_policy_snapshot,256),\'NULL\') FROM booking WHERE workspace_id=18 ORDER BY id;');
const before = snapshots();
const count = mysql('SELECT COUNT(*) FROM workspace_cancellation_rule WHERE workspace_id=18;');
assert(['0', '4'].includes(count), 'Existing custom policies must not be overwritten.');
const sql = `START TRANSACTION;
SELECT id FROM workspace WHERE id=18 AND organizer_id=1 AND name='FPT305' FOR UPDATE;
CREATE TEMPORARY TABLE policy_seed_guard(ok INT CHECK(ok=1));
INSERT INTO policy_seed_guard SELECT IF((SELECT COUNT(*) FROM workspace WHERE id=18 AND organizer_id=1 AND name='FPT305')=1,1,0);
INSERT INTO policy_seed_guard SELECT IF((SELECT COUNT(*) FROM workspace_cancellation_rule WHERE workspace_id=18)=0 OR ((SELECT COUNT(*) FROM workspace_cancellation_rule WHERE workspace_id=18)=4 AND (SELECT COUNT(*) FROM workspace_cancellation_rule WHERE workspace_id=18 AND ((min_hours_before_start=24 AND refund_percent=100) OR (min_hours_before_start=12 AND refund_percent=50) OR (min_hours_before_start=2 AND refund_percent=25) OR (min_hours_before_start=0 AND refund_percent=0)))=4),1,0);
INSERT INTO workspace_cancellation_rule(created_at,updated_at,workspace_id,min_hours_before_start,refund_percent)
SELECT CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,18,t.hours,t.rate FROM (SELECT 24 hours,100 rate UNION ALL SELECT 12,50 UNION ALL SELECT 2,25 UNION ALL SELECT 0,0) t
WHERE NOT EXISTS(SELECT 1 FROM workspace_cancellation_rule r WHERE r.workspace_id=18 AND r.min_hours_before_start=t.hours);
COMMIT;`;
if (!process.argv.includes('--apply')) {
  console.log('Prepared default policy for local FPT305; use --apply to back up and seed.');
} else {
  fs.mkdirSync(output, { recursive: true });
  const backup = path.join(output, 'before-policy-seed.sql');
  if (!fs.existsSync(backup)) {
    const dump = spawnSync('docker', ['exec', 'nexspace-mysql', 'sh', '-c',
      'export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"; exec mysqldump -uroot --single-transaction --skip-lock-tables --no-tablespaces nexspace workspace_cancellation_rule'], { maxBuffer: 32 * 1024 * 1024 });
    assert.equal(dump.status, 0, 'Backup required before seeding.');
    assert(dump.stdout.length > 0);
    fs.writeFileSync(backup, dump.stdout);
  }
  mysql(sql);
  assert.equal(mysql('SELECT min_hours_before_start,CAST(refund_percent AS DECIMAL(5,2)) FROM workspace_cancellation_rule WHERE workspace_id=18 ORDER BY min_hours_before_start DESC;'), '24\t100.00\n12\t50.00\n2\t25.00\n0\t0.00');
  assert.equal(snapshots(), before, 'Existing booking snapshots must remain unchanged.');
  const ids = mysql('SELECT id FROM workspace_cancellation_rule WHERE workspace_id=18 ORDER BY id;').split('\n');
  fs.writeFileSync(path.join(output, 'verified.json'), JSON.stringify({ workspaceId: 18, organizerId: 1, rules: [[24,100],[12,50],[2,25],[0,0]], ruleIds: ids, existingBookingSnapshotsUnchanged: true }, null, 2));
  if (count === '0') fs.writeFileSync(path.join(output, 'rollback-seeded-rules-only.sql'), `-- Manual rollback only; do not run after editing this policy.\nDELETE FROM workspace_cancellation_rule WHERE workspace_id=18 AND id IN (${ids.join(',')});\n`);
  console.log('FPT305: four default rules verified; booking snapshots unchanged. Backup saved.');
}

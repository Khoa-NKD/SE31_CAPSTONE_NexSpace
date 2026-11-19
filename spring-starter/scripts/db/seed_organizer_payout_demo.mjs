/** Local-only payout fixtures. This script never calls a payment gateway or transfers money. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const output = path.join(root, 'artifacts/analytics-demo-20261118');
const prefix = 'SIMULATED-AN261118-P';
const codes = ['046', '045', '043', '041', '040', '038'].map((n) => `DEMO-AN261118-${n}`);
const quote = (value) => value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
const cents = (value) => BigInt(value.replace('.', ''));
const decimal = (value) => `${value / 100n}.${String(value % 100n).padStart(2, '0')}`;
function mysql(sql) {
  const result = spawnSync('docker', ['exec', '-i', 'nexspace-mysql', 'sh', '-c',
    'export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"; exec mysql -uroot -N -B --raw nexspace'], {input:sql,encoding:'utf8'});
  assert.equal(result.status, 0, 'Local payout SQL failed; no gateway calls were made.');
  return result.stdout.trim();
}
assert(mysql('SELECT VERSION();').startsWith('8.4.'), 'Only the verified local MySQL 8.4 target is supported.');
const rows = mysql(`SELECT JSON_OBJECT('id',b.id,'code',b.booking_code,'gross',CAST(b.final_price AS CHAR),'fee',CAST(b.platform_fee_amount AS CHAR),'end',DATE_FORMAT(b.end_time,'%Y-%m-%d %H:%i:%s'))
  FROM booking b JOIN workspace w ON w.id=b.workspace_id WHERE b.booking_code IN (${codes.map(quote)})
  AND b.workspace_id=18 AND w.organizer_id=1 AND b.status='COMPLETED' AND b.end_time < '2026-11-18'
  AND JSON_UNQUOTE(JSON_EXTRACT(b.pricing_snapshot,'$.currency'))='VND'
  AND NOT EXISTS(SELECT 1 FROM refund_request r WHERE r.booking_id=b.id AND r.status='PROCESSED');`)
  .split('\n').filter(Boolean).map((line) => JSON.parse(line));
assert.equal(rows.length, 6, 'All six original demo bookings must remain eligible.');
const plan = codes.map((code,index) => {
  const booking = rows.find((b) => b.code === code);
  assert(booking);
  assert(cents(booking.gross)>0n && cents(booking.fee)>=0n && cents(booking.fee)<=cents(booking.gross));
  return {...booking,reference:prefix+String(index+1).padStart(2,'0'),
    status:index<3?'PAID':index<5?'HELD':'RELEASED',paidAt:index<3?'2026-11-18 10:00:00':null,
    payout:decimal(cents(booking.gross)-cents(booking.fee))};
});
assert.equal(plan.filter((p)=>p.status==='PAID').reduce((sum,p)=>sum+cents(p.payout),0n),29400000n);
fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'payout-demo-expected.json'),JSON.stringify({simulated:true,workspaceId:18,organizerId:1,
  paidDate:'18/11/2026',transferredAmount:'294000.00',counts:{PAID:3,HELD:2,RELEASED:1},fixtures:plan},null,2));
let sql = `START TRANSACTION;\nCREATE TEMPORARY TABLE payout_seed_guard(ok INT CHECK(ok=1));\n`;
for(const p of plan) {
  sql += `SELECT id FROM booking WHERE id=${p.id} AND booking_code=${quote(p.code)} FOR UPDATE;\n`;
  sql += `INSERT INTO payout_seed_guard SELECT IF((SELECT COUNT(*) FROM booking b JOIN workspace w ON w.id=b.workspace_id WHERE b.id=${p.id} AND b.booking_code=${quote(p.code)} AND b.workspace_id=18 AND w.organizer_id=1 AND b.status='COMPLETED' AND b.final_price=${p.gross} AND b.platform_fee_amount=${p.fee} AND EXISTS(SELECT 1 FROM payment_transaction t WHERE t.booking_id=b.id AND t.status='SUCCESS' AND t.reconciliation_status='MATCHED' AND t.paid_at IS NOT NULL AND t.received_amount>=b.final_price) AND NOT EXISTS(SELECT 1 FROM refund_request r WHERE r.booking_id=b.id AND r.status IN ('PENDING','APPROVED','PROCESSED')))=1,1,0);\n`;
  sql += `INSERT INTO payout_seed_guard SELECT IF(NOT EXISTS(SELECT 1 FROM organizer_payout WHERE booking_id=${p.id} AND (payout_reference IS NULL OR payout_reference<>${quote(p.reference)})),1,0);\n`;
  sql += `INSERT INTO organizer_payout(created_at,updated_at,eligible_at,gross_amount,paid_at,payout_amount,payout_reference,platform_fee_amount,refund_deduction_amount,status,booking_id,organizer_id,support_case_id)
    SELECT ${quote(p.end)},'2026-11-18 10:00:00',${quote(p.end)},${p.gross},${quote(p.paidAt)},${p.payout},${quote(p.reference)},${p.fee},0,${quote(p.status)},${p.id},1,NULL
    WHERE NOT EXISTS(SELECT 1 FROM organizer_payout WHERE booking_id=${p.id});\n`;
  sql += `INSERT INTO payout_seed_guard SELECT IF((SELECT COUNT(*) FROM organizer_payout WHERE booking_id=${p.id} AND organizer_id=1 AND payout_reference=${quote(p.reference)} AND status=${quote(p.status)} AND payout_amount=${p.payout} AND gross_amount=${p.gross} AND platform_fee_amount=${p.fee} AND refund_deduction_amount=0 AND paid_at <=> ${quote(p.paidAt)})=1,1,0);\n`;
}
sql += 'COMMIT;\n';
fs.writeFileSync(path.join(output,'seed-payout-demo.sql'),sql);
const rollback = `START TRANSACTION;\nDELETE o FROM organizer_payout o JOIN booking b ON b.id=o.booking_id WHERE o.organizer_id=1 AND b.workspace_id=18 AND b.booking_code IN (${codes.map(quote)}) AND o.payout_reference IN (${plan.map((p)=>quote(p.reference))});\nCOMMIT;\n`;
fs.writeFileSync(path.join(output,'remove-payout-demo-only.sql'),rollback);
if (process.argv.includes('--apply')) {
  const backup=path.join(output,'before-payout-seed.sql');
  if(!fs.existsSync(backup)) {
    const dump=spawnSync('docker',['exec','nexspace-mysql','sh','-c','export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"; exec mysqldump -uroot --single-transaction --skip-lock-tables --no-tablespaces nexspace organizer_payout'],{maxBuffer:32*1024*1024});
    assert.equal(dump.status,0,'A backup is required before applying payout fixtures.');
    assert(dump.stdout.length>0); fs.writeFileSync(backup,dump.stdout);
  }
  mysql(sql);
  const actual=JSON.parse(mysql(`SELECT JSON_OBJECT('rows',COUNT(*),'paid',SUM(status='PAID'),'held',SUM(status='HELD'),'released',SUM(status='RELEASED'),'transferred',CAST(SUM(CASE WHEN status='PAID' THEN payout_amount ELSE 0 END) AS CHAR)) FROM organizer_payout WHERE organizer_id=1 AND payout_reference IN (${plan.map((p)=>quote(p.reference))});`));
  assert.equal(actual.rows,6); assert.equal(actual.paid,3);assert.equal(actual.held,2);assert.equal(actual.released,1);assert.equal(actual.transferred,'294000.00');
  fs.writeFileSync(path.join(output,'payout-demo-verified.json'),JSON.stringify(actual,null,2));
  const cleanup=path.join(output,'remove-demo-only.sql');
  if(fs.existsSync(cleanup)) {
    let content=fs.readFileSync(cleanup,'utf8');
    if(!content.includes(prefix))content=content.replace('START TRANSACTION;','START TRANSACTION;\n'+rollback.split('\n')[1]);
    fs.writeFileSync(cleanup,content);
  }
  console.log('SIMULATED only: 3 PAID (294000 VND), 2 HELD, 1 RELEASED. Backup and rollback saved; no money transferred.');
} else console.log('Prepared six local payout fixtures; use --apply to insert them after backup.');

/** Local-only, additive analytics fixtures. No payment gateway, email or production schema changes. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const output = path.join(root, 'artifacts/analytics-demo-20261118');
const prefix = 'DEMO-AN261118-';
const bookings = [], payments = [], refunds = [];
const shifted = (date, days) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const stamp = (date, hour) => `${date} ${String(hour).padStart(2, '0')}:00:00`;
function localStamp(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}:${String(date.getSeconds()).padStart(2,'0')}`;
}
function booking(date, hours, status, customer, extra={}) {
  const id = bookings.length+1;
  const b = { id, code: prefix+String(id).padStart(3,'0'), customer, status, hours,
    created:stamp(shifted(date,-2),7), start:stamp(date,9), end:stamp(date,9+hours),
    base:hours*50000, tax:hours*4000, platformFee:hours*5000, final:hours*54000, ...extra };
  bookings.push(b); return b;
}
function payment(b, date, amount=b.final, extra={}) {
  const p = { id:payments.length+1, booking:b.id, date, amount, received:amount, status:'SUCCESS', reconciliation:'MATCHED', ...extra };
  payments.push(p); return p;
}
function refund(b,p,date,amount,source='ORGANIZER_CANCEL') {
  assert(amount >= 0 && amount <= p.received);
  refunds.push({ id:refunds.length+1, booking:b.id, payment:p.id, date, amount, source });
}
for(let i=0;i<48;i++) {
  const date=shifted('2026-10-01',i), hours=1+i%4;
  const status=i%12===5 ? 'CANCELLED' : i%10===3 ? 'EXPIRED' : i%8===6 ? 'CANCELLED' : i%13===8 ? 'NO_SHOW' : 'COMPLETED';
  const b=booking(date,hours,status,i%2 ? 7 : 4,{ start:stamp(date,8+i%4),end:stamp(date,8+i%4+hours) });
  if(status==='EXPIRED' || (status==='CANCELLED' && i%12!==5)) continue;
  const p=payment(b,stamp(shifted(date,-1),8));
  if(status==='CANCELLED') refund(b,p,stamp(shifted(date,-1),15),b.final);
}
const old=booking('2026-09-26',4,'CANCELLED',4);
const oldPayment=payment(old,'2026-09-25 08:00:00');
refund(old,oldPayment,'2026-11-03 15:00:00',old.final);
const duplicate=booking('2026-10-18',2,'COMPLETED',7,{ start:'2026-10-18 14:00:00',end:'2026-10-18 16:00:00' });
payment(duplicate,'2026-10-17 08:00:00');
const extra=payment(duplicate,'2026-10-22 10:00:00');
refund(duplicate,extra,'2026-11-08 15:00:00',extra.amount,'PAYMENT_DISCREPANCY');
const partial=booking('2026-11-06',4,'COMPLETED',4,{ start:'2026-11-06 10:00:00',end:'2026-11-06 14:00:00' });
const partialPayment=payment(partial,'2026-11-05 08:00:00');
refund(partial,partialPayment,'2026-11-12 15:00:00',54000,'ADMIN_DISPUTE');
refund(partial,partialPayment,'2026-11-15 15:00:00',27000,'ADMIN_DISPUTE');
const future=booking('2026-11-19',2,'CONFIRMED',7,{ start:'2026-11-19 12:00:00',end:'2026-11-19 14:00:00' });
payment(future,'2026-11-17 08:00:00');
const now=new Date();
assert.equal(localStamp(now).slice(0,10),'2026-11-18','These fixtures are dated November 18; do not seed on another day.');
const pending=booking('2026-11-20',2,'PENDING_PAYMENT',4,{ created:localStamp(now),expires:localStamp(new Date(now.getTime()+10*60000)) });
payment(pending, null,pending.final,{ received:null,status:'PENDING',reconciliation:'UNRECONCILED' });
const morning=booking('2026-11-18',2,'COMPLETED',4,{ created:'2026-11-17 07:00:00',start:'2026-11-18 08:00:00',end:'2026-11-18 10:00:00' });
payment(morning,'2026-11-17 08:15:00');
const afternoon=booking('2026-11-18',2,'CONFIRMED',7,{created:localStamp(new Date(now.getTime()-600000)),start:'2026-11-18 15:00:00',end:'2026-11-18 17:00:00'});
payment(afternoon,localStamp(now));

const quote = v => v==null ? 'NULL' : typeof v==='number' ? String(v) : "'"+String(v).replaceAll("'","''")+"'";
let sql=`SET NAMES utf8mb4;\nSTART TRANSACTION;\nCREATE TEMPORARY TABLE analytics_seed_guard(ok INT CHECK(ok=1));\nINSERT INTO analytics_seed_guard SELECT IF((SELECT COUNT(*) FROM booking WHERE booking_code LIKE '${prefix}%')=0 AND EXISTS(SELECT 1 FROM workspace w JOIN floor_plan f ON f.workspace_id=w.id JOIN bookable_resource r ON r.floor_plan_id=f.id JOIN resource_type t ON t.id=r.resource_type_id WHERE w.id=18 AND w.organizer_id=1 AND w.name='FPT305' AND r.id=188 AND r.parent_room_id IS NULL AND r.status='ACTIVE' AND t.currency='VND'),1,0);\n`;
for(const b of bookings) {
  const snapshot=JSON.stringify({demo:true,fixture:'analytics-20261118',resourceId:188,resourceCode:'DEMO-VIP',currency:'VND',unitPrice:50000,durationHours:b.hours,baseAmount:b.base,surchargeAmount:0,discountAmount:0,taxAmount:b.tax,serviceFeeAmount:0,finalPrice:b.final});
  const columns=['created_at','updated_at','booking_code','workspace_id','resource_id','customer_id','status','source','start_time','end_time','party_size','price_type','base_amount','final_price','addon_amount','surcharge_amount','discount_amount','tax_amount','service_fee_amount','platform_fee_amount','quota_used_amount','pricing_snapshot','cancellation_policy_snapshot','cancelled_at','cancel_source','cancel_reason','checked_in_at','checked_out_at','hold_expires_at'];
  const paid=payments.find(p=>p.booking===b.id&&p.status==='SUCCESS');
  const cancellation=b.status==='CANCELLED'||b.status==='EXPIRED';
  b.cancelledAt=cancellation?(paid ? paid.date.slice(0,10)+' 14:00:00' : b.created):null;
  const values=[b.created,b.created,b.code,18,188,b.customer,b.status,'MANUAL',b.start,b.end,4,'HOURLY',b.base,b.final,0,0,0,b.tax,0,b.platformFee,0,snapshot,'[]',b.cancelledAt,b.status==='CANCELLED'?'ORGANIZER':null,cancellation?'DEMO analytics fixture; not a real cancellation':null,b.status==='COMPLETED'?b.start:null,b.status==='COMPLETED'?b.end:null,b.expires??null];
  sql+=`INSERT INTO booking(${columns.join(',')}) VALUES(${values.map(quote).join(',')}); SET @b${b.id}=LAST_INSERT_ID();\n`;
}
for(const p of payments) {
  const b=bookings[p.booking-1];
  const cols=['booking_id','created_at','updated_at','order_code','gateway_transaction_id','amount','received_amount','status','reconciliation_status','paid_at','reconciliation_note','expires_at'];
  const vals=[`@b${b.id}`,quote(p.date??b.created),quote(p.date??b.created),String(881118000000+p.id),quote(`DEMO-AN261118-P${p.id}`),quote(p.amount),quote(p.received),quote(p.status),quote(p.reconciliation),quote(p.date),quote('DEMO LOCAL ONLY - no real gateway transaction'),quote(b.expires??null)];
  sql+=`INSERT INTO payment_transaction(${cols.join(',')}) VALUES(${vals.join(',')}); SET @p${p.id}=LAST_INSERT_ID();\n`;
}
for(const r of refunds) sql+=`INSERT INTO refund_request(booking_id,payment_transaction_id,created_at,updated_at,source,reason,requested_amount,approved_amount,status,processed_at,reviewed_at,reviewed_by,refund_reference,admin_note) VALUES(@b${r.booking},@p${r.payment},${quote(r.date)},${quote(r.date)},${quote(r.source)},'DEMO analytics fixture - no real refund',${r.amount},${r.amount},'PROCESSED',${quote(r.date)},${quote(r.date)},2,${quote(`DEMO-AN261118-R${r.id}`)},'DEMO local reporting sample');\n`;
sql+='COMMIT;\n';

function expected(from,to,includeOriginal=true) {
  const start=from+' 00:00:00',end=shifted(to,1)+' 00:00:00';
  const inside=x=>x!=null&&x>=start&&x<end;
  const first=new Map(bookings.map(b=>[b.id,payments.filter(p=>p.booking===b.id&&p.status==='SUCCESS').map(p=>p.date).sort()[0]]));
  const firstPaid=bookings.filter(b=>inside(first.get(b.id)));
  const receipts=payments.filter(p=>p.status==='SUCCESS'&&inside(p.date));
  const refunded=refunds.filter(r=>inside(r.date));
  const created=bookings.filter(b=>inside(b.created));
  const original=includeOriginal&&inside('2026-11-17 17:46:28')?1:0;
  const sum=rows=>rows.reduce((a,r)=>a+r.amount,0);
  let seconds=0; const heatmap={};
  for(const b of bookings) {
    if(!['CONFIRMED','COMPLETED','NO_SHOW','CHECKED_IN'].includes(b.status)||!first.get(b.id))continue;
    const s=Math.max(Date.parse(b.start.replace(' ','T')+'Z'),Date.parse(start.replace(' ','T')+'Z'));
    const e=Math.min(Date.parse(b.end.replace(' ','T')+'Z'),Date.parse(end.replace(' ','T')+'Z'));
    if(e<=s)continue;
    seconds+=(e-s)/1000;
    for(let h=Math.floor(s/3600000)*3600000;h<e;h+=3600000) {
      const d=new Date(h), key=`${(d.getUTCDay()+6)%7+1}-${d.getUTCHours()}`;
      heatmap[key]=(heatmap[key]??0)+(Math.min(e,h+3600000)-Math.max(s,h))/3600000;
    }
  }
  const paying=new Set(firstPaid.map(b=>b.customer));
  const statuses={}; created.forEach(b=>statuses[b.status]=(statuses[b.status]??0)+1); if(original)statuses.EXPIRED=(statuses.EXPIRED??0)+1;
  const trends={};
  const day=d=>trends[d]??=( {createdBookings:0,paidBookings:0,receivedAmount:0,refundedAmount:0,netAmount:0} );
  created.forEach(b=>day(b.created.slice(0,10)).createdBookings++);
  if(original)day('2026-11-17').createdBookings++;
  firstPaid.forEach(b=>day(first.get(b.id).slice(0,10)).paidBookings++);
  receipts.forEach(p=>day(p.date.slice(0,10)).receivedAmount+=p.received);
  refunded.forEach(r=>day(r.date.slice(0,10)).refundedAmount+=r.amount);
  Object.values(trends).forEach(v=>v.netAmount=v.receivedAmount-v.refundedAmount);
  const paidValue=firstPaid.reduce((sum,b)=>sum+payments.filter(p=>p.booking===b.id&&p.status==='SUCCESS').sort((a,b)=>a.date.localeCompare(b.date)||a.id-b.id)[0].amount,0);
  const received=receipts.reduce((s,p)=>s+p.received,0),refundAmount=sum(refunded);
  return {filter:{from,to},summary:{createdBookings:created.length+original,paidBookings:firstPaid.length,payingCustomers:paying.size,
    returningCustomers:[...paying].filter(customer=>payments.some(p=>p.status==='SUCCESS'&&p.date<start&&bookings[p.booking-1].customer===customer)).length,
    completedBookings:statuses.COMPLETED??0,cancelledBookings:statuses.CANCELLED??0,expiredBookings:statuses.EXPIRED??0,noShowBookings:statuses.NO_SHOW??0,
    receivedAmount:received.toFixed(2),refundedAmount:refundAmount.toFixed(2),netAmount:(received-refundAmount).toFixed(2),averagePaidBookingValue:(firstPaid.length?paidValue/firstPaid.length:0).toFixed(2),
    bookedHours:(seconds/3600).toFixed(4),receiptCount:receipts.length,refundCount:refunded.length,
    anomalousReceipts:receipts.filter(p=>{const b=bookings[p.booking-1];return ['CANCELLED','EXPIRED'].includes(b.status)&&(!b.cancelledAt||p.date>=b.cancelledAt);}).length},statuses,trends,heatmap,ledgerCount:receipts.length+refunded.length};
}
const ranges=[['2026-10-20','2026-11-18'],['2026-09-20','2026-10-19'],['2026-11-01','2026-11-18'],['2026-10-14','2026-10-31'],['2026-11-03','2026-11-03'],['2026-11-02','2026-11-02'],['2026-11-18','2026-11-18'],['2026-11-17','2026-11-17']];
const manifest={prefix,workspaceId:18,organizerId:1,resourceId:188,generatedAt:localStamp(now),pendingExpiresAt:pending.expires,counts:{bookings:bookings.length,payments:payments.length,refunds:refunds.length},ranges:ranges.map(([a,b])=>expected(a,b)),fixtures:{bookings,payments,refunds}};
fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'seed.sql'),sql);
fs.writeFileSync(path.join(output,'expected.json'),JSON.stringify(manifest,null,2));
fs.writeFileSync(path.join(output,'remove-demo-only.sql'),`START TRANSACTION;\nDELETE r FROM refund_request r JOIN booking b ON b.id=r.booking_id WHERE b.booking_code LIKE '${prefix}%';\nDELETE p FROM payment_transaction p JOIN booking b ON b.id=p.booking_id WHERE b.booking_code LIKE '${prefix}%';\nDELETE FROM booking WHERE booking_code LIKE '${prefix}%';\nCOMMIT;\n`);
if(process.argv.includes('--apply') || process.argv.includes('--reprice-existing')) {
  assert(fs.existsSync(path.join(output,'before-seed.sql')),'A backup is required before applying.');
  let executeSql=sql;
  if(process.argv.includes('--reprice-existing')) {
    executeSql=`START TRANSACTION; CREATE TEMPORARY TABLE reprice_guard(ok INT CHECK(ok=1)); INSERT INTO reprice_guard SELECT IF((SELECT COUNT(*) FROM booking WHERE booking_code LIKE '${prefix}%')=55,1,0);\n`;
    for(const b of bookings) executeSql+=`UPDATE booking SET base_amount=${b.base},tax_amount=${b.tax},platform_fee_amount=${b.platformFee},final_price=${b.final},pricing_snapshot=JSON_SET(pricing_snapshot,'$.baseAmount',${b.base},'$.taxAmount',${b.tax},'$.finalPrice',${b.final}) WHERE booking_code=${quote(b.code)};\n`;
    for(const p of payments) executeSql+=`UPDATE payment_transaction p JOIN booking b ON b.id=p.booking_id SET p.amount=${p.amount},p.received_amount=${quote(p.received)} WHERE b.booking_code=${quote(bookings[p.booking-1].code)} AND p.order_code=${881118000000+p.id};\n`;
    for(const r of refunds) executeSql+=`UPDATE refund_request SET requested_amount=${r.amount},approved_amount=${r.amount} WHERE refund_reference=${quote(`DEMO-AN261118-R${r.id}`)} AND booking_id IN (SELECT id FROM booking WHERE booking_code LIKE '${prefix}%');\n`;
    executeSql+=`UPDATE booking SET created_at=${quote(pending.created)},hold_expires_at=${quote(pending.expires)} WHERE booking_code=${quote(pending.code)} AND status='PENDING_PAYMENT';\nUPDATE payment_transaction p JOIN booking b ON b.id=p.booking_id SET p.created_at=b.created_at,p.expires_at=b.hold_expires_at WHERE b.booking_code=${quote(pending.code)} AND p.status='PENDING';\nCOMMIT;\n`;
    fs.writeFileSync(path.join(output,'reprice-demo-only.sql'),executeSql);
  }
  const result=spawnSync('docker',['exec','-i','nexspace-mysql','sh','-c','export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"; exec mysql -uroot --default-character-set=utf8mb4 --batch nexspace'],{input:executeSql,encoding:'utf8'});
  if(result.status!==0)throw new Error(`Seed failed (transaction rolled back): ${result.stderr}`);
}
console.log(JSON.stringify({applied:process.argv.includes('--apply')||process.argv.includes('--reprice-existing'),counts:manifest.counts,defaultRange:manifest.ranges[0].summary,manifest:path.join(output,'expected.json'),pendingExpiresAt:pending.expires},null,2));

/** Verifies the real frontend formatting/grouping functions using database-backed API responses. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const artifacts=path.join(root,'artifacts/analytics-demo-20261118');
const liveExpected=path.join(artifacts,'expected-live.json');
const expected=JSON.parse(fs.readFileSync(fs.existsSync(liveExpected)?liveExpected:path.join(artifacts,'expected.json'),'utf8'));
const reports=JSON.parse(fs.readFileSync(path.join(artifacts,'verified-api-reports.json'),'utf8'));
const {money,cents,chartTrends,change}=await import(pathToFileURL(path.join(root,'.worktrees/frontend/react-stater/src/features/organizer-analytics/format.ts')));
const checks=[];
for(const report of reports) {
  const reference=expected.ranges.find(r=>r.filter.from===report.filter.from&&r.filter.to===report.filter.to);
  assert(reference,'An independent expected range must exist');
  for(const [key,value] of Object.entries(reference.summary)) assert.equal(Number(report.current[key]),Number(value),key);
  for(const group of ['day','week','month']) {
    const rows=chartTrends(report.filter,report.trends,group);
    for(const key of ['receivedAmount','refundedAmount','netAmount']) {
      assert.equal(rows.reduce((sum,row)=>sum+cents(row[key]),0n),cents(reference.summary[key]),`${group}/${key}`);
    }
    for(const key of ['paidBookings','createdBookings']) assert.equal(rows.reduce((sum,row)=>sum+row[key],0),reference.summary[key]);
    checks.push(`${report.filter.from}..${report.filter.to}/${group}`);
  }
}
const current=reports[0].current,previous=reports[0].previous;
const cards={paidBookings:current.paidBookings,received:money(current.receivedAmount,'vi-VN'),refunded:money(current.refundedAmount,'vi-VN'),afterRefunds:money(current.netAmount,'vi-VN'),createdBookings:current.createdBookings,customers:current.payingCustomers,reservedHours:current.bookedHours,netChange:change(current.netAmount,previous.netAmount)};
assert.equal(cards.received,'3.240.000 ₫');
assert.equal(cards.refunded,'621.000 ₫');
assert.equal(cards.afterRefunds,'2.619.000 ₫');
assert.equal(cards.paidBookings,25);
assert.equal(cards.createdBookings,33);
assert.equal(cards.reservedHours,'56.0000');
const result={verifiedRanges:reports.length,verifiedChartGroupings:checks.length,cards,checks,browserVisualCheck:false};
fs.writeFileSync(path.join(artifacts,'verified-display.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));

const fs = require('fs');
const path = require('path');
const f = 'c:\\laragon\\www\\dopave\\ubercrm\\resources\\js\\pages\\Core\\Companies\\Show.tsx';
let s = fs.readFileSync(f, 'utf8');

const i = s.indexOf("activeTab === 'integration'");
const j = s.indexOf('<p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">', i);
const k = s.indexOf('{selectedRidingCompanyData?.integration', i);
if (i === -1 || j === -1 || k === -1) process.exit(1);
s = s.slice(0, j) + '\n                        ' + s.slice(k);
fs.writeFileSync(f, s);

const d = s.indexOf("activeTab === 'distribution'");
const h2 = s.indexOf('<h2 className="mb-2 text-lg font-semibold">Distribution</h2>', d);
const pClose = s.indexOf('</p>', h2);
let end = pClose + 4;
while (s[end] === ' ' || s[end] === '\n' || s[end] === '\r') end++;
s = s.slice(0, h2) + s.slice(end);
fs.writeFileSync(f, s);

const div = s.indexOf('<div className="space-y-4">', s.indexOf("activeTab === 'distribution'"));
const dt = s.indexOf('<DistributionSettingsTab', div);
if (div !== -1 && dt !== -1) {
  s = s.slice(0, div) + s.slice(dt);
  fs.writeFileSync(f, s);
}

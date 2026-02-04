const fs = require('fs');
const path = require('path');
const f = path.resolve(__dirname, 'resources/js/pages/Core/Companies/Show.tsx');
let s = fs.readFileSync(f, 'utf8');
if (s.indexOf("activeTab === 'integration'") === -1) { fs.writeFileSync(path.resolve(__dirname, 'err.txt'), 'no integration'); process.exit(1); }

// Integration: find and remove the <p>...</p> block (or <p>...{ in our case)
const iStart = s.indexOf("activeTab === 'integration'");
if (iStart === -1) return;
const pOpen = s.indexOf('<p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">', iStart);
if (pOpen === -1) return;
const lineEnd = s.indexOf('\n', pOpen);
const nextLine = s.indexOf('{selectedRidingCompanyData?.integration', iStart);
if (nextLine === -1) return;
// Remove from pOpen to just before nextLine, then add newline + spaces + rest
s = s.slice(0, pOpen) + '\n                        ' + s.slice(nextLine);

// Distribution: remove h2 and p
const dStart = s.indexOf("activeTab === 'distribution'");
if (dStart !== -1) {
  const h2 = s.indexOf('<h2 className="mb-2 text-lg font-semibold">Distribution</h2>', dStart);
  if (h2 !== -1) {
    const afterP = s.indexOf('</p>', h2) + 4;
    let end = afterP;
    while (end < s.length && /[\s]/.test(s[end])) end++;
    s = s.slice(0, h2) + s.slice(end);
  }
}

// Distribution: remove company name div
const divStart = s.indexOf('<div className="space-y-4">', s.indexOf("activeTab === 'distribution'"));
if (divStart !== -1) {
  const distTab = s.indexOf('<DistributionSettingsTab', divStart);
  if (distTab !== -1) {
    s = s.slice(0, divStart) + s.slice(distTab);
  }
}

fs.writeFileSync(f, s);

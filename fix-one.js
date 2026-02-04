const fs = require('fs');
const p = require('path');
const f = p.join(__dirname, 'resources/js/pages/Core/Companies/Show.tsx');
let s = fs.readFileSync(f, 'utf8');

const pBlock = /<p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">\s*Settings for this reseller.s company\.\s*/;

// Integration: remove first occurrence of paragraph that appears after "activeTab === 'integration'"
const iIdx = s.indexOf("activeTab === 'integration'");
let didIntegration = false;
if (iIdx !== -1) {
  const tail = s.slice(iIdx);
  const m = tail.match(pBlock);
  if (m) {
    s = s.slice(0, iIdx) + tail.replace(pBlock, '');
    didIntegration = true;
  }
}
fs.writeFileSync(p.join(__dirname, 'fix-log.txt'), 'iIdx=' + iIdx + ' didIntegration=' + didIntegration + ' len=' + s.length);

// Distribution: remove h2 and p
const dIdx = s.indexOf("activeTab === 'distribution'");
if (dIdx !== -1) {
  const tail = s.slice(dIdx);
  const h2p = /<h2 className="mb-2 text-lg font-semibold">Distribution<\/h2>\s*<p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">\s*Settings for this reseller.s company\.\s*<\/p>\s*/;
  const m = tail.match(h2p);
  if (m) {
    s = s.slice(0, dIdx) + tail.replace(h2p, '');
  }
}

// Distribution: remove company name div
s = s.replace(/<div className="space-y-4">\s*<div className="flex flex-wrap items-center gap-2 rounded-lg border p-4 dark:border-neutral-700">\s*<span className="font-medium mr-2">\{selectedRidingCompanyData\.name\}<\/span>\s*<Link[^>]*>[\s\S]*?<\/Link>\s*<\/div>\s*(<DistributionSettingsTab)/,
  '$1');

fs.writeFileSync(f, s);

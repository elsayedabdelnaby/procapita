const fs = require('fs');
const pathMod = require('path');
const filePath = pathMod.join(__dirname, 'resources/js/pages/Core/Companies/Show.tsx');
const logPath = pathMod.join(__dirname, 'fix-log.txt');
const log = (msg) => { try { fs.appendFileSync(logPath, msg + '\n'); } catch (e) {} };
try {
  var s = fs.readFileSync(filePath, 'utf8');
  log('File length: ' + s.length + ' integration idx: ' + s.indexOf("activeTab === 'integration'"));
} catch (e) {
  log('Error: ' + e.message);
  process.exit(1);
}

// Debug: find "reseller" and next char
const idx = s.indexOf('reseller');
if (idx >= 0) {
  const next = s.charCodeAt(idx + 7);
  log('After reseller char code: ' + next + ' expected 39 or 8217');
}

// Match the paragraph - apostrophe can be ASCII 39 or Unicode 2019
const paragraph = /<p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">\s*Settings for this reseller[\u2019']s company\.\s*<\/p>/;

// Integration: remove first paragraph that appears after "activeTab === 'integration'"
const integrationIdx = s.indexOf("activeTab === 'integration'");
if (integrationIdx !== -1) {
  const afterIntegration = s.slice(integrationIdx);
  const match = afterIntegration.match(paragraph);
  if (match) {
    const newAfter = afterIntegration.replace(paragraph, '').replace(/\n\s+\n\s+(\{selectedRidingCompanyData)/, '\n                        $1');
    s = s.slice(0, integrationIdx) + newAfter;
    log('Integration: removed paragraph');
  }
}

// Distribution: remove h2 and p (first occurrence after "activeTab === 'distribution'")
const distIdx = s.indexOf("activeTab === 'distribution'");
if (distIdx !== -1) {
  const afterDist = s.slice(distIdx);
  let changed = afterDist.replace(/<h2 className="mb-2 text-lg font-semibold">Distribution<\/h2>\s*/, '');
  changed = changed.replace(paragraph, '');
  if (changed !== afterDist) {
    s = s.slice(0, distIdx) + changed;
    log('Distribution: removed h2 and p');
  }
}

// Distribution: remove the div with company name + link (only in distribution section)
const divBlock = /<div className="space-y-4">\s*<div className="flex flex-wrap items-center gap-2 rounded-lg border p-4 dark:border-neutral-700">\s*<span className="font-medium mr-2">\{selectedRidingCompanyData\.name\}<\/span>\s*<Link href=\{\`\/ridingcarcompanies\/riding-companies\/\$\{selectedRidingCompanyData\.id\}\`\}>[\s\S]*?<\/Link>\s*<\/div>\s*<DistributionSettingsTab/;
if (divBlock.test(s)) {
  s = s.replace(divBlock, '<DistributionSettingsTab');
  log('Distribution: removed company div');
}

fs.writeFileSync(filePath, s);
log('Done');

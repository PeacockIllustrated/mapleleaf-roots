import { readFileSync, writeFileSync } from 'node:fs';

const sql = readFileSync('.seed-tmp/seed-campaigns.sql', 'utf8');
const blocks = sql.split(/(?=^with up as)/m).filter((b) => b.trim().startsWith('with up'));
blocks.forEach((b, i) => {
  writeFileSync(`.seed-tmp/seed-c${i + 1}.sql`, b);
});
console.log(`wrote ${blocks.length} files`);

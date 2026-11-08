const fs = require('fs');
const path = require('path');

const bundlePath = process.argv[2] || 'aidlc-bundle.txt';
if (!fs.existsSync(bundlePath)) {
  console.error('File not found:', bundlePath);
  process.exit(1);
}

const content = fs.readFileSync(bundlePath, 'utf8');
const fileRegex = /<file path="([^"]+)">\r?\n([\s\S]*?)\r?\n<\/file>/g;

let match;
let count = 0;
while ((match = fileRegex.exec(content)) !== null) {
  const relPath = match[1];
  const fileContent = match[2];
  const targetPath = path.resolve(process.cwd(), relPath);

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, fileContent, 'utf8');
  console.log(`[OK] Unpacked: ${relPath}`);
  count++;
}

console.log(`\n🎉 Successfully unpacked ${count} files!`);

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const kitDir = path.join(root, 'kit');
const outputFile = path.join(root, 'aidlc-bundle.txt');

// Collect all files in kit/
const bundle = {};
function collect(dir) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      collect(full);
    } else {
      const rel = path.relative(kitDir, full).replace(/\\/g, '/');
      bundle[rel] = fs.readFileSync(full, 'utf8');
    }
  }
}
collect(kitDir);

// Add README.vi.md
const readmeVi = path.join(root, 'README.vi.md');
if (fs.existsSync(readmeVi)) {
  bundle['README.vi.md'] = fs.readFileSync(readmeVi, 'utf8');
}

const banner = `# ==============================================================================
# GÓI MÃ NGUỒN VÀ QUY TRÌNH AI-DLC (SPEC-DRIVEN-AI BUNDLE)
# Định dạng: Văn bản thuần (Plain Text JSON) — Không nén, không nhị phân
# ==============================================================================
#
# 👉 CÁCH 1: DÙNG AI (CURSOR, WINDSURF, CLAUDE CODE, ANTIGRAVITY, CHATGPT)
# Chỉ cần mở chat với AI trong project mới và dán câu prompt sau:
#
# "Dưới đây là tệp aidlc-bundle.txt chứa mã nguồn kit AI-DLC dạng JSON (key là đường
# dẫn file, value là nội dung file). Hãy đọc tệp này và tạo lại toàn bộ cấu trúc
# thư mục và các file đúng y hệt 100% vào thư mục gốc của dự án này."
#
# ------------------------------------------------------------------------------
# 👉 CÁCH 2: DÙNG LỆNH TERMINAL (TỰ ĐỘNG GIẢI NÉN TRONG 1 GIÂY)
# Nếu máy bạn có Node.js, chỉ cần mở terminal tại thư mục dự án và chạy:
#
# node -e "const fs=require('fs'),path=require('path');const text=fs.readFileSync('aidlc-bundle.txt','utf8');const jsonStart=text.indexOf('{');const data=JSON.parse(text.slice(jsonStart));for(const [file,content] of Object.entries(data)){const target=path.resolve(file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content,'utf8');console.log('[OK]',file);}console.log('\nDa giai nen thanh cong toan bo file!');"
#
# ==============================================================================

`;

const fullText = banner + JSON.stringify(bundle, null, 2);
fs.writeFileSync(outputFile, fullText, 'utf8');

console.log(`[PACK COMPLETE]`);
console.log(`- File output: ${outputFile}`);
console.log(`- Total files: ${Object.keys(bundle).length}`);
console.log(`- Total size:  ${(fs.statSync(outputFile).size / 1024).toFixed(2)} KB`);

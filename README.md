# spec-driven-ai

[![npm version](https://img.shields.io/npm/v/spec-driven-ai.svg?style=flat-square)](https://www.npmjs.com/package/spec-driven-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://img.shields.io/badge/Node.js-%3E%3D16.0.0-brightgreen.svg?style=flat-square)](https://nodejs.org/)

> **Spec-Driven AI Development Lifecycle (AI-DLC) Harness & Guardrails for Legacy & Brownfield Codebases.**  
> Prevent the "Vibe Coding" trap. Protect existing systems, enforce adversarial test verification, and guarantee zero regressions.

📖 **[Xem Sổ tay Hướng dẫn Thực chiến Từng Bước (User Guide)](docs/USER_GUIDE.md)**

---

## 🚀 Quick Start (Chạy ngay không cần cài đặt)

### 1. Khởi tạo trong bất kỳ dự án nào (Initialize in any repository):
```bash
npx spec-driven-ai init
```
Lệnh này sẽ tự động thiết lập:
* `.agents/rules/` — Lồng sắt kỹ thuật (Khóa thư viện, ép File Whitelist, giới hạn Atomic PR).
* `.agents/workflows/` — Quy trình tác tử (Reverse-spec, Generate-tests, Implement-patch).
* `specs/templates/` — Mẫu Machine-Readable Spec & Living ADR.
* `.git/hooks/pre-commit` — Tự động chặn commit nếu Agent vi phạm rào chắn.

### 2. Tạo một bản đặc tả mới cho Ticket (Create a new Spec):
```bash
npx spec-driven-ai new JIRA-1024
```
Tạo ngay file `specs/active/SPEC-JIRA-1024.md` với đầy đủ metadata và cấu trúc chuẩn.

### 3. Kiểm tra rào chắn an toàn (Verify Guardrails):
```bash
npx spec-driven-ai check
```
Kiểm tra xem các tệp tin đang sửa đổi có nằm trong `File Whitelist` hay không, thư mục `tests/` có bị can thiệp trái phép không, và số lượng file có vượt ngân sách Atomic PR không.

---

## 🧠 Core Philosophy (Triết lý cốt lõi)

1. **Code is a Disposable Artifact (Code là sản phẩm phái sinh dùng một lần):** AI có thể sinh lại mã nguồn trong vài chục giây.
2. **Spec & Test are Core Assets (Spec & Test là tài sản cốt lõi):** Spec là bản vẽ thiết kế duy nhất, Test là thước đo độc lập không khoan nhượng.
3. **The 3-Gate Engine (Động cơ 3 Cổng kiểm soát):**

```text
[CỔNG 1: HUMAN SPEC GATE]
       │
       ▼  (Kỹ sư duyệt & đóng băng Spec -> SPEC_FROZEN)
[CỔNG 2: RED GATE - ADVERSARIAL TESTING]
       │  (QA Agent sinh test trong tests/ -> BẮT BUỘC PHẢI FAIL)
       ▼  (Khóa quyền ghi thư mục tests/ -> TESTS_GENERATED)
[CỔNG 3: GREEN GATE - CONSTRAINED DEV AGENT]
          (Dev Agent chỉ sửa code trong File Whitelist đến khi 100% test PASS)
          (Tự động kiểm tra: npx spec-driven-ai check)
```

---

## 🛡️ Key Features & Guardrails

* **Dual-Persona Isolation (Tách biệt đối kháng):** Tác tử viết test và tác tử viết code là hai vai trò độc lập. Developer Agent bị cấm tuyệt đối quyền sửa `tests/` để chống hiện tượng "vừa đá bóng vừa thổi còi".
* **File Whitelist Enforcement:** Chỉ cho phép Agent chỉnh sửa các file đã được khai báo tại Mục 4 của Spec. Toàn bộ phần còn lại của repo ở trạng thái Read-only.
* **Dependency Freeze:** Cấm Agent tự ý cài đặt thêm thư viện hoặc sửa đổi package manifests (`package.json`, `pom.xml`, `requirements.txt`).
* **Atomic PR Budget:** Giới hạn can thiệp tối đa 3–5 file logic trong mỗi tác vụ để kiểm soát triệt để nợ kỹ thuật trên hệ thống Brownfield.
* **Living ADR (Architecture Decision Record):** Bắt buộc lưu vết lý do kỹ thuật đằng sau mỗi can thiệp để phục vụ bảo trì dài hạn.

---

## 📦 Project Structure Installed

```text
your-project/
├── .agents/
│   ├── rules/
│   │   ├── 01-system-boundaries.md    # Boundary rules & Whitelist enforcement
│   │   └── 02-adversarial-testing.md   # Role separation & Tests lockdown
│   └── workflows/
│       ├── reverse-spec.md            # Codebase archaeologist for legacy files
│       ├── generate-tests.md          # Adversarial QA workflow (Red Gate)
│       └── implement-patch.md         # Constrained dev workflow (Green Gate)
├── specs/
│   ├── templates/
│   │   ├── SPEC_TEMPLATE.md           # Machine-readable spec format
│   │   └── LIVING_ADR_TEMPLATE.md     # Architecture decision record template
│   ├── active/                        # Current active specs
│   └── archive/                       # Merged & completed specs
└── scripts/
    └── check-guardrails.sh            # POSIX bash fallback
```

---

## 🛠️ How to Publish / Contribute

### Publish to NPM:
```bash
# 1. Đăng nhập vào tài khoản npm (nếu chưa đăng nhập):
npm login

# 2. Xuất bản lên npmjs.com:
npm publish --access public
```

---

## 📄 License

MIT © [Cuong Bui](LICENSE)

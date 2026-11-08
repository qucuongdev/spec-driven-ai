# spec-driven-ai — Bộ Công Cụ Quy Trình AI-DLC Di Động

> **Ngôn ngữ / Languages**: [🇻🇳 Tiếng Việt](README.vi.md) | [🇬🇧 English](README.md)

**spec-driven-ai** là bộ công cụ quy trình vòng đời phát triển phần mềm định hướng bởi AI (AI-DLC — AI Software Development Lifecycle) theo chuẩn di động (portable). Bộ công cụ chuyển hóa trọn vẹn quy trình bàn giao từ **Vé Jira ➔ Unit Test đối kháng trước khi viết code ➔ Thẩm định độc lập ➔ Bản thảo GitHub PR hợp lệ**.

Bạn chỉ cần đưa vé Jira cho trợ lý lập trình (AI coding assistant), hệ thống sẽ tự động phối hợp bối cảnh, lập đặc tả (spec), viết bài test kiểm thử đối kháng (QA Red Test), thi công code tối thiểu (Coder Green), thẩm định độc lập mã băm SHA (Auditor), và phát hành PR kèm đầy đủ bằng chứng kiểm thử mà không thể bị ảo giác (hallucination) hay sửa mã ngoài phạm vi (scope violation).

---

## 1. Cấu Trúc Thư Mục Kit

Khi tích hợp vào dự án bất kỳ, toàn bộ bộ công cụ nằm gói gọn trong thư mục gốc:

```text
your-project/
├── AGENTS.md                  # Cầu nối hướng dẫn mỏng (15-20 dòng) cho các AI coding assistants
└── .aidlc/                    # Bộ công cụ quy trình AI-DLC độc lập
    ├── company.json           # Chính sách công ty, quy ước Jira, bảo vệ nhánh và quy định PR
    ├── agents/                # Prompts phân quyền: Architect, QA Tester, Coder, Auditor
    ├── rules/                 # Các luật bất biến: ranh giới hệ thống, kiểm thử đối kháng
    ├── workflows/             # 5 pha, 11 giai đoạn (ticket-autopilot, jira-to-github...)
    ├── context/               # Bối cảnh dự án dùng chung (business glossary, rules, architecture)
    ├── specs/                 # Hồ sơ vé đang chạy (active), đã hoàn tất (archive) và templates
    ├── docs/                  # Tài liệu hướng dẫn (AI_DLC_START_HERE, USER_GUIDE, WORKFLOW)
    └── tools/                 # CLI cục bộ độc lập (Node.js >= 16, không cần npm install)
```

---

## 2. Hướng Dẫn Tích Hợp Vào Dự Án

### Cách 1: Copy thủ công hoặc dùng helper script
Copy toàn bộ nội dung trong thư mục [`kit/`](kit/) (gồm file ẩn `.aidlc/` và file `AGENTS.md`) vào thư mục gốc repository mục tiêu:

```sh
# Từ thư mục repo spec-driven-ai, chạy lệnh:
node scripts/copy-kit.js ../du-an-cua-ban
```

Helper script sẽ chỉ sao chép các tệp còn thiếu, thông báo nếu có xung đột, **tuyệt đối không ghi đè** `package.json`, không chỉnh sửa Git hooks và không cài thêm dependencies nào vào dự án của bạn.

### Cách 2: Đóng gói thành file nén di động (Windows PowerShell)
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/package-kit.ps1
```
Lệnh sẽ tạo file `.zip` chứa cấu trúc kit sạch sẽ, sẵn sàng giải nén vào bất kỳ máy chủ hay workspace nào.

---

## 3. Cách Bắt Đầu Với Trợ Lý Lập Trình (AI Coding Assistant)

Hỗ trợ mọi IDE & công cụ AI phổ biến hiện nay: **Cursor, Windsurf, Claude Code, Antigravity, GitHub Copilot Workspace**.

### Bước 1: Kích hoạt tác vụ
Mở dự án trong IDE và gửi một câu lệnh đơn giản:

> *"Thực hiện JIRA-1024: [Dán đường link vé hoặc nội dung Acceptance Criteria vào đây]"*

### Bước 2: Tự động điều phối theo vòng đời AI-DLC
Trợ lý AI (vai trò **Coordinator**) sẽ tự động đọc `AGENTS.md`, tải quy trình `ticket-autopilot.md` và điều phối 4 chuyên gia:
1. **Khởi tạo bối cảnh (Context & Isolation)**: Tạo nhánh vé riêng biệt từ base branch (không commit trực tiếp lên main/develop), quét bối cảnh dự án.
2. **Kiến trúc sư (Architect)**: Khảo sát mã nguồn (read-only), chuyển hóa Acceptance Criteria thành kịch bản kiểm thử BDD trong `spec.md`, và **khóa cứng ranh giới** trong `plan.json` (`allowedFiles`, `testFiles`, `verificationCommands`).
3. **Kiểm thử đối kháng (QA Tester)**: Viết bộ test đối kháng vào `tests/**`. Chạy lệnh kiểm thử và bắt buộc ghi nhận **Test Thất Bại Hợp Lệ (Valid Red Baseline, Exit != 0)** do thiếu logic nghiệp vụ.
4. **Lập trình viên (Coder)**: Chỉ được phép sửa các file được liệt kê trong `allowedFiles`. Tuyệt đối **không được sửa test của QA**. Viết code tối thiểu cho đến khi test chuyển sang **Xanh (Green Pass, Exit == 0)**.
5. **Kiểm toán viên độc lập (Auditor)**: Chụp mã băm SHA git tree của candidate commit, đối chiếu diff độc lập với `plan.json`. Đảm bảo 0 file bẩn nằm ngoài phạm vi cho phép và 0 leak secret.
6. **Bản thảo PR & Cổng phê duyệt người (Human Gatekeeper)**: Xuất bản GitHub PR ở dạng bản thảo (Draft PR), đăng nhận xét phân tích AI findings minh bạch (AI COMMENT). Dừng lại chờ người thật ký duyệt (`APPROVE`) và merge.

---

## 4. Hướng Dẫn Sử Dụng CLI Cục Bộ (`.aidlc/tools/cli.js`)

Bộ công cụ đi kèm CLI tiện ích bằng Node.js thuần (không dependencies ngoài), giúp theo dõi bằng chứng và trạng thái vé:

```sh
# Xem trợ giúp và danh sách lệnh
node .aidlc/tools/cli.js help

# Kiểm tra độ sẵn sàng của môi trường (Offline diagnostic)
node .aidlc/tools/cli.js doctor

# Tạo vé làm việc mới (mặc định chế độ tự hành autonomous)
node .aidlc/tools/cli.js new JIRA-1024 --profile bugfix

# Xem trạng thái hiện tại của vé và các artifacts đã hoàn thành
node .aidlc/tools/cli.js status JIRA-1024

# Kiểm tra vi phạm phạm vi (Scope check - phát hiện file lạ ngoài plan.json)
node .aidlc/tools/cli.js check JIRA-1024

# Chạy lệnh kiểm thử có ghi nhận bằng chứng và đối chiếu hash git tree
node .aidlc/tools/cli.js verify JIRA-1024 --command "npm test"

# Chuyển giai đoạn tự hành (Tác tử tự ghi nhận tiến độ)
node .aidlc/tools/cli.js progress JIRA-1024 --agent coordinator --note "Đã hoàn thành xác minh test baseline"

# Chuyển giai đoạn có người phê duyệt (Human checkpoint)
node .aidlc/tools/cli.js advance JIRA-1024 --by "NguyenVanA" --note "Đã kiểm tra và phê duyệt kiến trúc"

# Mở lại (reopen) một giai đoạn trước đó khi cần điều chỉnh
node .aidlc/tools/cli.js reopen JIRA-1024 --stage plan --by "NguyenVanA" --note "Cần bổ sung thêm allowedFiles"
node .aidlc/tools/cli.js revise JIRA-1024 --stage implement --agent coordinator --note "Sửa lại logic theo phản hồi review"
```

---

## 5. Sáu Nguyên Tắc Bất Biến (Architectural Invariants)

Hệ thống AI-DLC đảm bảo **Zero Hallucinations** và **Zero Regressions** nhờ 6 nguyên tắc cốt lõi:

| Nguyên tắc | Nội dung cam kết |
| :--- | :--- |
| **1. Phân Tách Quyền Hạn (RBAC)** | Architect chỉ đọc; QA chỉ được sửa `tests/**`; Coder chỉ được sửa `allowedFiles`; Auditor đối chiếu độc lập trên đúng SHA commit. |
| **2. Bắt Buộc Test Đỏ (Red Baseline)** | Test đối kháng của QA bắt buộc phải FAIL hợp lệ (`Exit != 0`) trước khi Coder được cấp quyền thi công mã logic. |
| **3. Khóa Ranh Giới Cứng (Hard Scope)** | `plan.json` giới hạn chặt chẽ danh sách file và số lượng file tối đa (`maxFiles`). Bất kỳ file nào nằm ngoài danh sách đều bị chặn ngay lập tức. |
| **4. Bằng Chứng Bất Biến (SHA Fingerprint)** | Mỗi lần chạy `verify`, hệ thống chụp fingerprint trước và sau lệnh. Nghiêm cấm lệnh kiểm thử làm thay đổi file trong repo. |
| **5. Cổng Kiểm Soát Con Người (Human Control)** | AI chỉ đăng nhận xét `COMMENT`, tuyệt đối không bao giờ tự ký duyệt `APPROVE` trên PR của chính mình. Merge và deploy bắt buộc cần người thật cấp phép. |
| **6. Đóng Vòng Lặp Tri Thức (Knowledge Loop)** | Sau khi release, bài học kinh nghiệm và quy tắc mới được cập nhật ngược lại vào `.aidlc/context/` để các vé sau kế thừa. |

---

## 6. Giao Diện Bản Đồ Trực Quan Hóa (Workflow Visualization)

Dự án cung cấp giao diện tương tác trực quan cao cấp tại file [`workflow-visualization.html`](workflow-visualization.html):
- **3 Góc nhìn toàn diện**:
  1. *Vòng đời AI-DLC*: Xem chi tiết 5 pha, 11 giai đoạn, các cổng điều kiện và vòng lặp phản hồi sửa lỗi.
  2. *Phân luồng Subagents (Swimlanes)*: Xem đường chuyển giao nhiệm vụ giữa 5 làn chuyên gia (Coordinator, Architect, QA Tester, Coder, Auditor, Human).
  3. *Quy trình Jira-to-GitHub PR*: Theo dõi 13 bước khép kín từ lúc nhận vé đến khi PR hoàn tất trên GitHub.
- **Tính năng**:
  - Hỗ trợ Pan & Zoom mượt mà (chuột, phím tắt `F` để Fit view, `Ctrl + lăn chuột`).
  - Lọc nhanh theo Profile (`feature`, `bugfix`, `refactor`, `express`).
  - Thanh tìm kiếm tức thời theo tên giai đoạn, vai trò, artifact.
  - Bảng chi tiết Inspector (nhấn vào từng thẻ để xem hợp đồng nghiệm thu, inputs/outputs, lệnh CLI mẫu, tài liệu quy chuẩn).
  - Xuất sơ đồ vector SVG độc lập chất lượng cao.

---

## 7. Phát Triển & Kiểm Thử Kit

Dành cho maintainer phát triển và kiểm định bộ công cụ:

```sh
# Chạy toàn bộ test suites kiểm thử hồi quy và tích hợp
npm test

# Kiểm tra tính toàn vẹn cấu trúc kit di động
node scripts/check-kit.js

# Chạy bộ test giao diện tự động bằng Playwright
npm run test:ui

# Kiểm tra đóng gói file nén di động
npm run test:package
```

---
*Bản quyền (C) spec-driven-ai team. Giấy phép MIT.*

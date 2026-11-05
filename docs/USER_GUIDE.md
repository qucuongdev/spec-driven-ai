# SỔ TAY VẬN HÀNH THỰC CHIẾN (SPEC-DRIVEN AI-DLC USER GUIDE)

Tài liệu này hướng dẫn từng bước (Step-by-Step) cách sử dụng khung **spec-driven-ai** trong công việc hàng ngày, từ lúc nhận ticket cho đến khi mở Pull Request an toàn 100%.

---

## 📌 MÔ HÌNH VẬN HÀNH TỔNG QUAN

```text
Yêu cầu / Bug Ticket
       │
       ▼
[BƯỚC 1: CỔNG 1 - SPEC GATE] 
   • Tạo spec: `npx spec-driven-ai new JIRA-1024`
   • (Nếu code cũ khó hiểu) Kích hoạt Agent Khảo cổ (reverse-spec)
   • Kỹ sư thẩm định Invariants & File Whitelist -> Đổi status: "SPEC_FROZEN"
       │
       ▼
[BƯỚC 2: CỔNG 2 - RED GATE]
   • Kích hoạt QA Agent (generate-tests)
   • Sinh test trong `tests/**` -> Chạy test BẮT BUỘC PHẢI FAIL (AssertionError)
   • Khóa thư mục tests/ -> Đổi status: "TESTS_GENERATED"
       │
       ▼
[BƯỚC 3: CỔNG 3 - GREEN GATE]
   • Kích hoạt Dev Agent (implement-patch)
   • Dev Agent CHỈ sửa code trong File Whitelist (tests/ ở chế độ Read-only)
   • Vòng lặp tự sửa lỗi (Self-healing loop <= 5 chu kỳ) đến khi 100% test PASS
       │
       ▼
[BƯỚC 4: NGHIỆM THU & MỞ PR]
   • Chạy rào chắn: `npx spec-driven-ai check`
   • Ghi chép Living ADR (Lý do kỹ thuật & Nợ chấp nhận)
   • Git Hook tự động bảo vệ khi `git commit` -> Mở Atomic PR
```

---

## 🛠️ PHẦN 1: CÀI ĐẶT LẦN ĐẦU VÀO DỰ ÁN (CHỈ CẦN LÀM 1 LẦN)

Mở terminal tại thư mục gốc của dự án bạn muốn bảo vệ (Java, Python, Node, Go, C#...) và chạy:

```bash
npx spec-driven-ai init
```

**Kết quả nhận được:**
* Sinh ra `.agents/rules/` và `.agents/workflows/`.
* Sinh ra `specs/templates/`, `specs/active/`, `specs/archive/`.
* Tự động cài Git Hook vào `.git/hooks/pre-commit` (Tự động chặn nếu Agent sửa sai file).

---

## 🚀 PHẦN 2: KỊCH BẢN THỰC CHIẾN TỪNG BƯỚC VỚI TICKET CỤ THỂ

Giả sử bạn nhận được ticket: **`JIRA-1024: Sửa lỗi tính sai chiết khấu đơn hàng cũ khi có mã giảm giá VIP`**.

### BƯỚC 1: Khởi tạo & Đóng băng Đặc tả (Cổng 1 - Human Gate)

1. **Gõ lệnh tạo Spec:**
   ```bash
   npx spec-driven-ai new JIRA-1024
   ```
   *File được tạo tại: `specs/active/SPEC-JIRA-1024.md`*

2. **Nếu code legacy quá phức tạp, chưa hiểu hết luồng:**
   Mở chat với AI Agent và dán prompt:
   > *"Hãy đóng vai Codebase Archaeologist. Hãy đọc kỹ file `.agents/workflows/reverse-spec.md` và tiến hành khảo sát file `src/services/discount_service.py` để trích xuất hành vi hiện tại vào file `specs/active/SPEC-JIRA-1024.md`. Tuyệt đối không sửa code."*

3. **Kỹ sư thẩm định và đóng lồng sắt:**
   Mở file `specs/active/SPEC-JIRA-1024.md` và kiểm tra 2 mục quan trọng nhất:
   * **Mục 3. Invariants:** Tích chọn các điều kiện cấm vi phạm (không đổi version thư viện, không làm vỡ các loại mã giảm giá cũ).
   * **Mục 4. File Whitelist:** Điền chính xác các file được phép can thiệp:
     ```markdown
     ### 4.1. Danh sách tệp được phép can thiệp (Allowed Files)
     1. `src/services/discount_service.py`
     ```
   * **Đổi trạng thái ở Header:**
     ```yaml
     status: "SPEC_FROZEN"
     ```

---

### BƯỚC 2: Sinh bộ kiểm thử đối kháng (Cổng 2 - Red Gate)

Mục tiêu: Bắt buộc phải có test case chứng minh lỗi đang tồn tại trước khi cho phép đụng vào code.

1. **Gửi prompt cho AI Agent:**
   > *"Hãy đóng vai QA Engineer (Red Team). Hãy đọc kỹ file `.agents/rules/02-adversarial-testing.md` và workflow `.agents/workflows/generate-tests.md`. Dựa vào file `specs/active/SPEC-JIRA-1024.md`, hãy tạo bộ test đối kháng trong thư mục `tests/` để kiểm thử kịch bản lỗi của ticket này. Đảm bảo test chạy trên code cũ BẮT BUỘC PHẢI BÁO FAIL vì sai logic (AssertionError), không được fail do lỗi cú pháp."*

2. **Chạy test xác nhận màu ĐỎ:**
   ```bash
   # Ví dụ với Python:
   pytest tests/test_discount.py
   # Kết quả: FAILED (AssertionError: Expected 800000 but got 900000) -> ĐẠT CHUẨN!
   ```

3. **Đóng băng thư mục test:**
   Mở `specs/active/SPEC-JIRA-1024.md` đổi trạng thái:
   ```yaml
   status: "TESTS_GENERATED"
   ```
   *(Từ giây phút này, thư mục `tests/` chuyển sang trạng thái Read-only. AI Dev không được phép sửa test nữa).*

---

### BƯỚC 3: Sửa mã trong lồng sắt (Cổng 3 - Green Gate)

Mục tiêu: Viết lượng code tối thiểu để biến toàn bộ test sang màu xanh mà không chạm vào file ngoài.

1. **Gửi prompt cho AI Agent:**
   > *"Hãy đóng vai Constrained Developer (Blue Team). Hãy đọc kỹ file `.agents/rules/01-system-boundaries.md` và workflow `.agents/workflows/implement-patch.md`. Dựa vào file `specs/active/SPEC-JIRA-1024.md`, hãy sửa code CHỈ TRONG CÁC FILE THUỘC FILE WHITELIST để pass 100% test case trong `tests/test_discount.py`. Bạn bị CẤM TUYỆT ĐỐI sửa các file trong `tests/`."*

2. **AI kích hoạt vòng lặp tự sửa lỗi (Self-healing Loop):**
   * AI sửa `src/services/discount_service.py`.
   * AI chạy lại test.
   * Nếu test fail, AI tự đọc lỗi và sửa tiếp cho đến khi:
     ```bash
     pytest tests/test_discount.py
     # Kết quả: 1 passed, 100% GREEN!
     ```

---

### BƯỚC 4: Kiểm tra rào chắn & Mở Pull Request

1. **Chạy kiểm tra an toàn tự động:**
   ```bash
   npx spec-driven-ai check
   ```
   *Nếu báo: `✅ PASSED: All modifications strictly comply with Spec & Guardrails!` $\rightarrow$ Đạt chuẩn.*

2. **Ghi chép Living ADR:**
   Mở file `specs/active/SPEC-JIRA-1024.md` đổi trạng thái:
   ```yaml
   status: "VERIFIED"
   ```
   Tạo file `specs/active/ADR-JIRA-1024.md` (copy từ mẫu) ghi lại 3 dòng: *Tại sao chọn cách sửa này? Đã cân nhắc phương án nào? Có nợ kỹ thuật nào không?*

3. **Commit và đẩy code:**
   ```bash
   git add .
   git commit -m "fix(billing): correct VIP discount calculation (closes JIRA-1024)"
   git push origin feature/JIRA-1024
   ```
   *Lưu ý: Nếu Agent lỡ tay sửa lan man ra ngoài Whitelist, lệnh `git commit` sẽ bị Git Pre-commit Hook CHẶN ĐỨNG ngay lập tức.*

4. **Nội dung Pull Request gửi Senior Review:**
   Bạn chỉ cần copy bảng **Acceptance Checklist** từ Spec dán vào mô tả PR:
   ```markdown
   ## Tóm tắt giải pháp (JIRA-1024)
   - Đã sửa logic chiết khấu VIP theo đúng Spec tại `specs/active/SPEC-JIRA-1024.md`.
   - Quyết định kiến trúc được lưu tại `specs/active/ADR-JIRA-1024.md`.

   ## Acceptance Verification
   - [x] TC-HAPPY-01: Tính đúng 20% cho khách VIP (Chứng minh: `test_vip_discount_happy_path`) -> PASS
   - [x] TC-EDGE-01: Không áp dụng 2 lần mã giảm giá (Chứng minh: `test_prevent_double_discount`) -> PASS
   - [x] Guardrails: Không sửa file ngoài whitelist, không thêm thư viện mới.
   ```

---

## 📋 CHEAT SHEET: BỘ 3 PROMPT THẦN THÁNH (COPY & PASTE)

| Giai đoạn | Vai trò Agent | Prompt mẫu dán vào khung chat AI |
| :--- | :--- | :--- |
| **Pha 1: Khảo cổ** | Archaeologist | `Đóng vai Codebase Archaeologist theo .agents/workflows/reverse-spec.md. Hãy khảo sát file [đường_dẫn_file] và ghi nhận hành vi hiện tại vào specs/active/SPEC-[MÃ_TICKET].md. Cấm sửa code.` |
| **Pha 2: Sinh Test** | QA Agent (Red) | `Đóng vai QA Engineer theo .agents/workflows/generate-tests.md và .agents/rules/02-adversarial-testing.md. Đọc specs/active/SPEC-[MÃ_TICKET].md, sinh test đối kháng trong tests/. Yêu cầu test chạy trên code cũ BẮT BUỘC PHẢI FAIL (AssertionError).` |
| **Pha 3: Vá Code** | Dev Agent (Blue) | `Đóng vai Developer theo .agents/workflows/implement-patch.md và .agents/rules/01-system-boundaries.md. Đọc specs/active/SPEC-[MÃ_TICKET].md, chỉ sửa các file trong File Whitelist đến khi 100% test PASS. Cấm tuyệt đối sửa thư mục tests/.` |

# ADR-[ID]: [TIÊU ĐỀ QUYẾT ĐỊNH KIẾN TRÚC NGẮN GỌN]

<!--
  LIVING ADR (Architecture Decision Record):
  Bản ghi lại lý do kỹ thuật đằng sau mỗi can thiệp logic quan trọng của AI và Kỹ sư.
  Giữ cho dự án Brownfield không bị biến thành "hộp đen" sau nhiều lần AI can thiệp.
-->

## 1. THÔNG TIN QUẢN TRỊ (METADATA)
```yaml
adr_id: "ADR-YYYYMMDD-[TICKET_ID]"
spec_ref: "specs/active/SPEC-YYYYMMDD-[TICKET_ID].md"
date: "YYYY-MM-DD"
status: "ACCEPTED" # PROPOSED | ACCEPTED | DEPRECATED | SUPERSEDED
deciders:
  - "AI Agent (Dev Persona)"
  - "[Tên Kỹ sư / Tech Lead phụ trách]"
impacted_modules:
  - "src/modules/[module_name]"
```

---

## 2. BỐI CẢNH & VẤN ĐỀ CẦN GIẢI QUYẾT (Context & Problem Statement)
* *Vấn đề kỹ thuật cụ thể nào buộc chúng ta phải đưa ra quyết định kiến trúc này?*
* *Những ràng buộc thực tế của hệ thống Brownfield hiện tại (ví dụ: không thể đập đi xây lại, database đang có hàng triệu records, framework đã cũ)?*

---

## 3. CÁC PHƯƠNG ÁN ĐÃ CÂN NHẮC (Considered Options)

### Phương án 1: [Tên phương án - Ví dụ: Refactor toàn bộ module sang Clean Architecture]
* **Mô tả sơ bộ:** Đập bỏ tầng logic cũ, viết lại theo chuẩn mới.
* **Ưu điểm (Pros):** Kiến trúc sạch, dễ viết unit test mới.
* **Nhược điểm (Cons):** 
  * Bán kính ảnh hưởng quá lớn (vượt File Touch Budget).
  * Nguy cơ cao làm vỡ các hành vi ngầm mà hệ thống cũ phụ thuộc.
  * Tốn quá nhiều thời gian và token context.

### Phương án 2: [Tên phương án - Ví dụ: Dùng Quick-patch / Monkey-patching tại chỗ]
* **Mô tả sơ bộ:** Thêm điều kiện `if-else` trực tiếp vào hàm legacy để lách lỗi.
* **Ưu điểm (Pros):** Nhanh, diff chỉ vài dòng code.
* **Nhược điểm (Cons):** 
  * Tăng nợ kỹ thuật (Cyclomatic Complexity tăng cao).
  * Khó bảo trì, tiếp tục làm biến dạng "Codebase Frankenstein".

### Phương án 3 (LỰA CHỌN): [Tên phương án - Ví dụ: Strangler Fig Pattern cục bộ / Thêm Adapter Interface]
* **Mô tả sơ bộ:** Bọc logic cũ bằng một lớp Adapter/Decorator mới, chuyển hướng luồng xử lý mới qua Adapter trong khi giữ nguyên chữ ký gọi của các consumer cũ.
* **Ưu điểm (Pros):** 
  * Đảm bảo tính tương thích ngược 100% (Invariants).
  * Khoanh vùng can thiệp đúng trong phạm vi File Whitelist.
  * Tách biệt logic mới để dễ dàng viết test đối kháng (Adversarial Tests).
* **Nhược điểm (Cons):** Cần thêm 1 file abstraction layer nhỏ.

---

## 4. KẾT QUẢ QUYẾT ĐỊNH & LÝ DO CHỌN (Decision Outcome & Rationale)
* **Phương án được chọn:** `[Phương án 3]`
* **Lý do kỹ thuật cốt lõi:**
  * Thỏa mãn toàn bộ danh sách **Invariants** đã quy định trong Spec.
  * Không làm phình to diff (tuân thủ giới hạn $\le$ 3-5 files của Atomic PR).
  * Cho phép cô lập lỗi để rollback an toàn nếu phát sinh sự cố.

---

## 5. HỆ QUẢ & ĐÁNH ĐỔI KỸ THUẬT (Consequences & Trade-offs)

### Hệ quả tích cực (Positive Consequences)
* Khắc phục triệt để lỗi gốc mà không gây hồi quy (Zero Regression).
* Codebase duy trì được ranh giới rõ ràng giữa logic cũ (legacy) và logic mới vá (patched).
* Toàn bộ test suites hiện tại vẫn chạy bình thường mà không cần sửa đổi.

### Hệ quả tiêu cực & Nợ kỹ thuật chấp nhận (Negative Consequences / Accepted Debt)
* *[Ghi nhận thành thật các điểm đánh đổi. Ví dụ: Chưa tối ưu hóa triệt để hiệu năng CPU ở mức micro-second; Tạm thời chấp nhận tồn tại 2 cách xử lý song song trong vòng 3 tháng trước khi deprecate hoàn toàn code cũ].*
* **Kế hoạch dọn dẹp (Cleanup Ticket):** `[JIRA-XXXX để dọn dẹp khi toàn bộ module được di trú]`

---

## 6. PHƯƠNG PHÁP KIỂM CHỨNG TỰ ĐỘNG (Verification Strategy)
* **Test case xác nhận quyết định này:** `tests/[path]/test_adr_compliance.py`
* **Linter / Architectural rule kiểm tra:** `ArchUnit / ESLint / custom rule` đảm bảo các module khác không gọi tắt qua lớp Adapter này.

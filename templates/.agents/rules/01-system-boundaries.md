# RULE 01: SYSTEM BOUNDARIES & ISOLATION (LỒNG SẮT KỸ THUẬT VÀ PHẠM VI CAN THIỆP)

> **MỤC ĐÍCH TỐI THƯỢNG:** Bảo vệ hệ thống Brownfield khỏi sự phá hủy cấu trúc do AI tự tiện thay đổi (Unintended Side-effects / Vibe Coding Drift). Mọi can thiệp của AI Agent vào codebase phải nằm trong lồng sắt kiểm soát xác định.

---

## ĐIỀU 1: PHẠM VI TỆP TIN & QUY TẮC FILE WHITELIST
1. **Tuân thủ tuyệt đối Whitelist:** 
   * Trước khi chỉnh sửa bất kỳ tệp tin nào, Agent BẮT BUỘC phải đọc danh sách `File Whitelist` trong file Spec đang kích hoạt (`specs/active/SPEC-*.md`).
   * **CẤM TUYỆT ĐỐI** tạo mới, chỉnh sửa, đổi tên hoặc xóa bất kỳ tệp tin nào không có tên trong `File Whitelist`.
2. **Cấm tự ý Format / Refactor diện rộng (No Spurious Diffs):**
   * CẤM chạy auto-formatter (Prettier, Black, Clang-Format...) trên các file ngoài Whitelist hoặc trên toàn bộ repository.
   * Khi sửa đổi một file trong Whitelist, chỉ sửa các dòng code phục vụ trực tiếp cho mục tiêu của Spec. Cấm sửa đổi style code, import reordering, hoặc đổi tên biến ở các hàm không liên quan.
3. **Nguyên tắc Atomic PR & Giới hạn tệp can thiệp (File Touch Budget):**
   * Số lượng tệp tin logic nghiệp vụ được phép can thiệp trong một PR/Task **không được vượt quá ngân sách đã định (tối đa 3 đến 5 files)**.
   * Nếu bài toán yêu cầu sửa nhiều hơn 5 files, Agent PHẢI DỪNG LẠI và thông báo cho Kỹ sư để chia nhỏ Spec thành các pha độc lập (Micro-Specs).
   * Mỗi PR sinh ra phải có tính nguyên tử (Atomic): Merge vào là build được, test pass 100%, deploy độc lập được mà không làm gãy hệ thống.

---

## ĐIỀU 2: ĐÓNG BĂNG MÔI TRƯỜNG & PHỤ THUỘC (DEPENDENCY FREEZE)
1. **Cấm tự ý cài đặt thư viện mới:**
   * CẤM THỰC THI bất kỳ lệnh cài đặt gói nào: `npm install <pkg>`, `yarn add <pkg>`, `pnpm add <pkg>`, `pip install <pkg>`, `poetry add <pkg>`, `go get <pkg>`, `cargo add <pkg>`.
   * Cấm tự ý chỉnh sửa file quản lý gói: `package.json`, `requirements.txt`, `Pipfile`, `pom.xml`, `build.gradle`, `go.mod`, `Cargo.toml`.
   * **Ngoại lệ duy nhất:** Khi và chỉ khi mục `2. Interfaces & Contracts` hoặc `3. Invariants` trong file Spec chỉ định đích danh tên thư viện và version cụ thể được phép cài đặt.
2. **Cấm nâng cấp / hạ cấp phiên bản hiện hữu:**
   * Tuyệt đối không tự động "bump version" của các dependency có sẵn để giải quyết xung đột mã nguồn. Mã nguồn mới phải tương thích với stack thư viện hiện tại của hệ thống Brownfield.

---

## ĐIỀU 3: BẢO VỆ RANH GIỚI KIẾN TRÚC (ARCHITECTURE AS CODE)
1. **Bảo tồn phân tầng kiến trúc (Architectural Layering):**
   * Tuân thủ quy tắc một chiều của Dependency Rule:
     * Tầng Domain/Entity KHÔNG ĐƯỢC phụ thuộc vào tầng Database/Infrastructure hay Presentation/Controller.
     * Cấm import Controller vào Service, cấm import Infrastructure vào Core Domain.
2. **Cấm đường tắt (No Architecture Bypassing):**
   * Cấm viết SQL raw hoặc ORM query trực tiếp trong Controller/Handler nếu hệ thống đã có Repository/DAO layer.
   * Cấm bypass Middleware xác thực (Auth), phân quyền (RBAC), hoặc validation pipelines.
3. **Cấm rò rỉ trạng thái toàn cục (No Hidden Global State):**
   * Không tạo các biến Singleton toàn cục có khả năng ghi (Mutable Global State) gây race-condition trong môi trường đa luồng (Multi-threading / Async).

---

## ĐIỀU 4: BẢO MẬT & BẢO VỆ DỮ LIỆU
1. **Cấm Hardcode Bí mật kỹ thuật (Zero Secrets Policy):**
   * Cấm đưa API Keys, Token, Mật khẩu DB, Private Key, hoặc URL môi trường production vào code hoặc mock tests. Mọi cấu hình phải đọc qua biến môi trường hoặc Secret Manager.
2. **Cấm Log Dữ liệu nhạy cảm (PII / Sensitive Data):**
   * Không ghi log thông tin định danh cá nhân (Họ tên, SĐT, Email, CCCD, Số thẻ tín dụng, Số dư tài khoản). Luôn sử dụng hàm masking nếu cần debug.

---

## ĐIỀU 5: CƠ CHẾ TỰ ĐỘNG CHẶN (PRE-COMMIT / GUARDRAIL ENFORCEMENT)
* Trước khi hoàn thành tác vụ, Agent phải chạy script kiểm tra biên:
  ```bash
  bash scripts/check-guardrails.sh
  ```
* Nếu script trả về mã lỗi (`exit 1`), Agent phải tự động revert các thay đổi vi phạm trước khi tiếp tục. Bất kỳ PR nào vi phạm quy tắc lồng sắt này sẽ bị CI/CD tự động hủy bỏ.

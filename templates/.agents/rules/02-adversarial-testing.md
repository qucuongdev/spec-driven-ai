# RULE 02: ADVERSARIAL TESTING & ROLE SEPARATION (KIỂM THỬ ĐỐI KHÁNG VÀ PHÂN LẬP VAI TRÒ)

> **MỤC ĐÍCH TỐI THƯỢNG:** Triệt tiêu hoàn toàn hiện tượng "AI vừa đá bóng vừa thổi còi" (Tự viết code sai rồi tự sửa test case cho test xanh). Kiểm thử phải là thước đo độc lập, khách quan và không khoan nhượng.

---

## ĐIỀU 1: NGUYÊN TẮC PHÂN LẬP HAI VAI TRÒ (DUAL-PERSONA ISOLATION)

Quá trình AI-DLC được phân chia thành 2 tác tử với ngữ cảnh và quyền hạn hoàn toàn độc lập:

```
+-----------------------------------------------------------------------+
|                         CỔNG 1: HUMAN SPEC (Frozen)                   |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|  VAI TRÒ A: QA AGENT (RED TEAM)                                       |
|  - Quyền ghi: DUY NHẤT thư mục `tests/`                              |
|  - Quyền đọc: Toàn quyền đọc Spec và Code hiện tại                    |
|  - Mục tiêu: Tạo bộ test đối kháng chứng minh logic mới CHƯA TỒN TẠI |
+-----------------------------------------------------------------------+
                                   |
                       GIAO BÀN THỬ NGHIỆM ĐỎ (FAIL)
                                   |
                                   v
+-----------------------------------------------------------------------+
|  VAI TRÒ B: DEVELOPER AGENT (BLUE TEAM)                               |
|  - Quyền ghi: CHỈ ĐƯỢC PHÉP ghi vào `File Whitelist`                  |
|  - Quyền trên `tests/`: STRICTLY READ-ONLY (CẤM GHI TUYỆT ĐỐI)         |
|  - Mục tiêu: Viết code tối thiểu để biến toàn bộ test từ ĐỎ sang XANH|
+-----------------------------------------------------------------------+
```

---

## ĐIỀU 2: LỆNH CẤM GHI THƯ MỤC KIỂM THỬ ĐỐI VỚI DEVELOPER AGENT
1. **Trạng thái Read-only của `tests/`:**
   * Khi thực hiện workflow lập trình (`implement-patch.md`), Agent tự động mang vai trò **Developer Agent**.
   * Bất kỳ hành vi nào nhằm tạo mới, sửa đổi dòng code, xóa file, hoặc comment out test case trong các thư mục sau đây đều bị coi là **VI PHẠM BẢO MẬT CẤP ĐỘ CAO (CRITICAL VIOLATION)**:
     * `tests/**`, `test/**`, `__tests__/**`, `spec/**`
     * Các file cấu hình test: `jest.config.*`, `pytest.ini`, `vitest.config.*`, `.mocharc.*`
2. **Cấm gian lận kiểm thử (Anti-Tampering):**
   * CẤM sử dụng các cờ bỏ qua test: `@unittest.skip`, `it.skip`, `describe.skip`, `test.todo`, `@pytest.mark.skip`.
   * CẤM can thiệp vào test runner để ép mã thoát trả về 0 (ví dụ: `npm test || true`).

---

## ĐIỀU 3: QUY TẮC "BẮT BUỘC PHẢI THẤT BẠI" CỦA QA AGENT (THE "MUST FAIL" LAW)
1. **Tiêu chuẩn nghiệm thu của Cổng 2 (Red Gate):**
   * Sau khi QA Agent sinh xong bộ kiểm thử dựa trên Spec, toàn bộ các test case mới **BẮT BUỘC PHẢI CHẠY THẤT BẠI (FAIL)** trên codebase hiện tại.
   * Nếu bộ test vừa sinh ra đã chạy PASS ngay lập tức:
     * *Trường hợp A:* Logic đó đã tồn tại từ trước trong hệ thống $\rightarrow$ Spec bị thừa hoặc hiểu sai hiện trạng.
     * *Trường hợp B:* Test case được viết quá nông cạn (Tautological test - viết cho có, không assert thực chất) $\rightarrow$ QA Agent phải viết lại test đối kháng sâu hơn.
2. **Tính chất của lỗi Thất bại (Assertion Failure vs Error):**
   * Bộ test phải thất bại do **vi phạm kiểm chứng (AssertionError / Expected X but got Y)**.
   * **CẤM THẤT BẠI DO LỖI CÚ PHÁP HOẶC IMPORT:** Nếu test thất bại vì `SyntaxError`, `ImportError`, `ModuleNotFoundError`, hoặc `TypeError` trong fixture cấu hình, test suite đó bị tính là KHÔNG HỢP LỆ. QA Agent phải sửa lại phần setup cho đến khi test gọi được vào code và chỉ fail ở bước `assert`.

---

## ĐIỀU 4: TIÊU CHUẨN KIỂM THỬ ĐỐI KHÁNG (ADVERSARIAL TEST RIGOR)
QA Agent khi viết test phải bao phủ đủ 4 chiều kích:
1. **Kiểm thử hành vi thuận (Happy Path):** Kiểm chứng đúng theo hợp đồng dữ liệu tại mục `2. Interfaces & Contracts` của Spec.
2. **Kiểm thử giá trị biên (Boundary Testing):** 
   * Số 0, số âm, số nguyên cực đại/cực tiểu ($2^{31}-1, 2^{63}-1$).
   * Chuỗi rỗng `""`, chuỗi chỉ có khoảng trắng, chuỗi UTF-8 đa ngôn ngữ, chuỗi độ dài cực lớn (10MB payload).
   * Mảng rỗng `[]`, mảng chứa phần tử null/undefined `[null]`.
3. **Kiểm thử tính bất biến (Invariants Verification):**
   * Viết test kiểm tra tính tương thích ngược của API cũ.
   * Viết test ép xung đồng thời (Concurrency / Race-condition test) nếu Spec yêu cầu xử lý đa luồng.
4. **Kiểm thử bẫy lỗi (Negative & Adversarial Testing):**
   * Giả lập downstream service trả về lỗi, timeout, hoặc trả về payload sai format xem hệ thống có rollback an toàn không.

---

## ĐIỀU 5: XỬ LÝ XUNG ĐỘT: BÁO CÁO BẤT NHẤT ĐẶC TẢ (SPEC INCONSISTENCY REPORT)
Nếu Developer Agent sau 3 vòng lặp tự sửa lỗi mà nhận thấy một test case là **bất khả thi về mặt kỹ thuật** hoặc **trái ngược với quy định Invariants**:
* **HÀNH ĐỘNG CẤM:** Không được tự ý sửa test.
* **HÀNH ĐỘNG ĐÚNG:** Dừng tiến trình và xuất file `specs/active/SPEC_INCONSISTENCY_REPORT.md` gửi tới Kỹ sư/Architect với cấu trúc:
  1. *Test case bị xung đột:* Tên hàm và vị trí test file.
  2. *Lý do không thể pass:* Chứng minh toán học/kỹ thuật tại sao logic hiện tại hoặc cấu trúc hệ thống ngăn cản test này.
  3. *Đề xuất điều chỉnh:* Đề xuất sửa Spec hay sửa Test để Kỹ sư con người phê duyệt.

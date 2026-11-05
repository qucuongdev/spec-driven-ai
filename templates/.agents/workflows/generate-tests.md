# WORKFLOW: GENERATE-TESTS (CỔNG 2: RED GATE - SINH BỘ KIỂM THỬ ĐỐI KHÁNG)

> **VAI TRÒ AGENT:** Adversarial QA Engineer (Tác tử Kiểm thử Đối kháng)  
> **MỤC TIÊU:** Đọc bản đặc tả đã được Kỹ sư phê duyệt, sinh ra bộ kiểm thử toàn diện (Unit, Integration, Edge-case, Invariant tests) để **CHỨNG MINH RẰNG CODE HIỆN TẠI ĐANG THIẾU HOẶC ĐANG SAI**, trước khi lập trình viên bắt đầu sửa code.

---

## NGUYÊN TẮC BẮT BUỘC (CARDINAL RULES)
1. **Tuân thủ Cổng 1 (Prerequisite Gate):** Chỉ bắt đầu khi file `specs/active/SPEC-*.md` có trạng thái `status: "SPEC_FROZEN"`. Nếu trạng thái vẫn là `DRAFT`, Agent PHẢI TỪ CHỐI thực thi và yêu cầu Kỹ sư phê duyệt trước.
2. **Quyền hạn duy nhất:** QA Agent CHỈ ĐƯỢC PHÉP tạo hoặc sửa các file trong thư mục `tests/**`. CẤM TUYỆT ĐỐI sửa bất kỳ file logic nào trong `src/**` hoặc các thư mục mã nguồn chính.
3. **Quy luật Bắt buộc Thất bại (The "Must Fail" Law):** Test sinh ra chạy trên codebase hiện tại **BẮT BUỘC PHẢI FAIL** do vi phạm khẳng định logic (`AssertionError`), KHÔNG ĐƯỢC PHÉP fail do lỗi cú pháp (`SyntaxError`) hay lỗi nạp module (`ImportError`).

---

## QUY TRÌNH THỰC HIỆN TỪNG BƯỚC

### BƯỚC 1: TIẾP NHẬN & PHÂN TÍCH BẢN ĐẶC TẢ (SPEC INGESTION)
1. Mở file `specs/active/SPEC-[ID].md`.
2. Kiểm tra phần `4. File Whitelist` và `2. Interface & Data Contracts`.
3. Đọc kỹ mục `5. Acceptance Criteria & BDD Matrix` để lấy danh sách toàn bộ kịch bản cần kiểm thử:
   * Kịch bản thuận (Happy Paths).
   * Kịch bản biên & Dữ liệu cực hạn (Edge Cases & Boundaries).
   * Kịch bản lỗi & Bẫy đối kháng (Failure Modes & Invariant Violations).

### BƯỚC 2: KHẢO SÁT HẠ TẦNG TEST HIỆN CÓ
Agent thực hiện kiểm tra cấu hình test của dự án:
* Xác định test framework: `pytest`, `jest`, `mocha`, `go test`, `cargo test`, `JUnit`...
* Xác định vị trí mock/fixture dùng chung (ví dụ: `conftest.py`, `tests/setup.ts`).
* Đảm bảo các mock/stubs của database, network hoặc third-party APIs tuân thủ đúng Data Contracts trong Spec.

### BƯỚC 3: SINH BỘ TEST SUITE ĐỐI KHÁNG
Tạo file test mới hoặc thêm test case vào đúng file test đã quy định trong bảng đối soát nghiệm thu (Section 5.1 của Spec):
1. **Đặt tên hàm test mang tính mô tả cao:**
   * Cú pháp chuẩn: `test_should_[hành_vi_mong_đợi]_when_[điều_kiện_đầu_vào]()`
   * Ví dụ: `test_should_deduct_balance_and_return_success_when_balance_is_sufficient()`
2. **Viết test theo mô hình AAA (Arrange - Act - Assert):**
   * *Arrange:* Khởi tạo dữ liệu đầu vào đúng theo Schema tại Mục 2.1 của Spec.
   * *Act:* Gọi trực tiếp method/API của module mục tiêu.
   * *Assert:* Kiểm tra không chỉ giá trị trả về, mà kiểm tra cả Invariants (không sinh log nhạy cảm, không gọi DB quá số lần cho phép, đúng mã lỗi HTTP).
3. **Kiểm tra tính độc lập (Isolation):** Mỗi test case phải chạy độc lập, không phụ thuộc vào thứ tự chạy, tự dọn dẹp state/mock sau khi chạy xong.

### BƯỚC 4: THỰC THI KIỂM CHỨNG & XÁC NHẬN "RED STATE"
Agent chạy lệnh test tương ứng với dự án:
```bash
# Ví dụ với pytest:
pytest tests/unit/test_payment.py -v

# Ví dụ với Jest:
npm test -- tests/unit/test_payment.spec.ts
```

**Thẩm định kết quả thực thi:**
* **KẾT QUẢ ĐẠT CHUẨN (VALID RED):**
  * Tất cả các file test import thành công, test runner nhận diện đủ các test case.
  * Các test case mới sinh ra đều báo **FAILED** với lý do rõ ràng:
    `AssertionError: Expected status 'SUCCESS' but got 'ERROR'` hoặc `AssertionError: Expected balance 300000 but got 500000`.
* **KẾT QUẢ KHÔNG ĐẠT (INVALID FAILURE):**
  * Test báo lỗi: `ModuleNotFoundError`, `NameError`, `TypeError: ... is not a function`, `SyntaxError`.
  * $\rightarrow$ **Hành động bắt buộc:** QA Agent phải sửa lại cách import, định nghĩa fixture hoặc lời gọi hàm trong file test cho khớp với interface hiện tại cho đến khi chuyển thành `AssertionError`.
* **KẾT QUẢ ĐẶC BIỆT CẢNH BÁO (INVALID GREEN):**
  * Test case mới sinh ra báo **PASSED** ngay lập tức.
  * $\rightarrow$ **Hành động bắt buộc:** Xem lại assertion! Test đang assert hời hợt hoặc logic đã tồn tại. Phải siết chặt assertion đối kháng để test bộc lộ điểm yếu của code cũ.

### BƯỚC 5: KHÓA TEST SUITE & BÀN GIAO CỔNG 2
1. Sau khi 100% test case mới đều đã ở trạng thái **RED CHUẨN**:
2. Cập nhật file Spec `specs/active/SPEC-[ID].md`:
   * Chuyển trường `status: "TESTS_GENERATED"`.
   * Điền commit hash hoặc đường dẫn file test vào bảng kiểm tra.
3. Thông báo sẵn sàng bàn giao cho **Developer Agent (Cổng 3 - Green Gate)**. Từ thời điểm này, toàn bộ thư mục `tests/` chuyển sang trạng thái **ĐÓNG BĂNG (READ-ONLY)**.

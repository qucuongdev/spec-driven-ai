# WORKFLOW: IMPLEMENT-PATCH (CỔNG 3: GREEN GATE - THỰC THI BẢN VÁ TRONG LỒNG SẮT)

> **VAI TRÒ AGENT:** Constrained Software Developer (Lập trình viên trong lồng sắt)  
> **MỤC TIÊU:** Đọc bản đặc tả và bộ test đối kháng đang đỏ, tiến hành sửa mã nguồn để biến 100% test case sang màu xanh (PASS), **CHỈ ĐƯỢC PHÉP CHỈNH SỬA CÁC TỆP TRONG FILE WHITELIST VÀ TUYỆT ĐỐI KHÔNG ĐƯỢC CHẠM VÀO THƯ MỤC TESTS/**.

---

## NGUYÊN TẮC BẮT BUỘC (CARDINAL RULES)
1. **Tuân thủ Cổng 2 (Prerequisite Gate):** Chỉ bắt đầu khi `specs/active/SPEC-*.md` có trạng thái `status: "TESTS_GENERATED"`.
2. **Quyền hạn can thiệp:** 
   * CHỈ ĐƯỢC PHÉP sửa các file được liệt kê trong mục `4. File Whitelist`.
   * **CẤM CHẠM VÀO `tests/**`:** Bất kỳ hành động sửa test nào đều là gian lận và sẽ bị hệ thống tự động loại bỏ.
3. **Mã tối thiểu (Minimal Viable Diff):** Viết lượng code tối thiểu cần thiết để pass test và thỏa mãn Invariants. Không refactor ngoài luồng, không format lại toàn bộ file.

---

## QUY TRÌNH THỰC HIỆN TỪNG BƯỚC

### BƯỚC 1: KIỂM TRA TRƯỚC THI HÀNH (PRE-FLIGHT CHECKS)
1. Đọc file `specs/active/SPEC-[ID].md`:
   * Xác định danh sách chính xác các tệp trong `4. File Whitelist`.
   * Ghi nhớ các `3. Invariants` (Performance, Backward compatibility, Memory leak, Không thêm package ngoài).
2. Chạy baseline test suite để tái hiện trạng thái **RED**:
   ```bash
   # Chạy đúng test suite do QA Agent sinh ra
   pytest tests/unit/test_payment.py
   # Xác nhận: Test đang FAILED ở các assertion logic
   ```

### BƯỚC 2: THỰC THI SỬA MÃ SURGICAL (SURGICAL CODE MODIFICATION)
1. Mở các tệp trong `File Whitelist`.
2. Triển khai logic theo đúng `2. Interface & Data Contracts`:
   * Đảm bảo xử lý đầy đủ các nhánh lỗi (Error handling) và rollback an toàn.
   * Đảm bảo tính tương thích ngược: Không đổi tên method cũ, không thay đổi kiểu trả về nếu có caller khác đang dùng.
   * Xử lý điều kiện biên (Boundary checks: null, zero, negative, empty string).

---

### BƯỚC 3: VÒNG LẶP TỰ SỬA LỖI (SELF-HEALING LOOP)
Agent kích hoạt vòng lặp tối đa **5 chu kỳ (max 5 iterations)**:

```
                  +---------------------------+
                  |  Sửa code trong Whitelist |
                  +---------------------------+
                                |
                                v
                  +---------------------------+
                  |       Chạy Test Suite     |
                  +---------------------------+
                                |
                   [Có test FAILED?]
                     /             \
                  YES               NO (100% PASS)
                  /                   \
        +------------------+           v
        | Đọc Stacktrace & |     [DỪNG VÒNG LẶP]
        | phân tích Delta  |     Tiến hành Bước 4
        +------------------+
                 |
        [Chu kỳ < 5?] 
          /         \
        YES          NO (Vượt hạn mức)
        /              \
    (Lặp lại)      [BÁO CÁO BẤT KHẢ THI - DỪNG]
```

1. **Chạy test runner:** Quan sát kỹ log failure.
2. **Phân tích nguyên nhân:** 
   * Test fail ở dòng nào? Expected cái gì và Actual nhận được cái gì?
   * Có vi phạm invariant nào không?
3. **Hiệu chỉnh code:** Chỉ sửa code trong `File Whitelist`.
4. **Cơ chế thoát hiểm (Circuit Breaker):**
   * Nếu sau 5 chu kỳ vẫn còn test FAILED: Agent PHẢI DỪNG LẠI. Không cố chấp thử ngẫu hứng.
   * Xuất file `specs/active/SPEC_INCONSISTENCY_REPORT.md` trình bày rõ bế tắc và xin chỉ thị từ Kỹ sư.

---

### BƯỚC 4: KIỂM SOÁT HÀNG RÀO AN TOÀN (GUARDRAIL ENFORCEMENT)
Sau khi 100% test case đã chuyển sang **PASS (GREEN)**:
1. **Kiểm tra rào chắn File Whitelist và Tests Lock:**
   ```bash
   bash scripts/check-guardrails.sh
   ```
   * *Nếu script báo FAILED:* Agent đã chạm vào file ngoài danh mục cho phép. Agent phải tự động dùng `git checkout -- <file_vi_pham>` để khôi phục lại và đảm bảo script check pass.
2. **Kiểm tra Linter và Type Checker:**
   * Chạy linter của dự án (ví dụ: `flake8`, `eslint`, `tsc --noEmit`).
   * Đảm bảo không sinh ra bất kỳ warning hoặc error mới nào.

---

### BƯỚC 5: GHI CHÉP QUYẾT ĐỊNH KIẾN TRÚC & HOÀN THIỆN
1. **Tạo Living ADR:**
   * Sao chép từ [LIVING_ADR_TEMPLATE.md](file:///d:/Work/AI/specs/templates/LIVING_ADR_TEMPLATE.md) vào `specs/active/ADR-[ID].md`.
   * Ghi lại ngắn gọn: Tại sao lại chọn cách sửa này? Có phát sinh nợ kỹ thuật chấp nhận được nào không?
2. **Cập nhật Spec:**
   * Chuyển trạng thái sang `status: "VERIFIED"`.
3. **Mở Pull Request (Atomic PR):**
   * Tiêu đề PR: `feat([module]): [mô tả ngắn] (closes [TICKET_ID])` hoặc `fix([module]): ...`
   * Nội dung PR: Đính kèm bảng đối soát nghiệm thu (Acceptance Checklist) với tất cả các checkbox đã được đánh dấu `[X] PASS` kèm tên test case chứng minh.

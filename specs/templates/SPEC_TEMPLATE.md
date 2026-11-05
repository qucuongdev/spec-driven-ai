# SPEC-[ID]: [TÊN TÍNH NĂNG HOẶC MÃ SỰ CỐ]

<!--
  QUY TẮC BẮT BUỘC ĐỐI VỚI AGENT VÀ KỸ SƯ:
  1. Bản đặc tả này là "Source of Truth" (Nguồn chân lý duy nhất). Code chỉ là sản phẩm phái sinh.
  2. Toàn bộ nội dung bên dưới phải rõ ràng, xác định (deterministic), không dùng từ mơ hồ (ví dụ: "nhanh", "hợp lý", "tối ưu").
  3. Kỹ sư phải ký duyệt (Status: SPEC_FROZEN) trước khi bất kỳ dòng code hoặc test nào được sinh ra.
-->

## METADATA & CONTROL BLOCK
```yaml
spec_version: "1.0.0"
spec_id: "SPEC-YYYYMMDD-[TICKET_ID]"
ticket_id: "[JIRA-1234 / ISSUE-567]"
module: "[Tên Module / Service bị ảnh hưởng]"
author: "[Tên Kỹ sư phụ trách]"
reviewer: "[Tên Principal / Senior Architect thẩm định]"
status: "DRAFT" # Giá trị hợp lệ: DRAFT | SPEC_FROZEN | TESTS_GENERATED | IMPLEMENTING | VERIFIED | CLOSED
target_branch: "main" # hoặc develop / release/*
created_at: "YYYY-MM-DD"
last_updated: "YYYY-MM-DD"
max_file_touch_budget: 3 # Số lượng file logic tối đa được phép can thiệp (khuyến nghị: 3-5)
```

---

## 1. CONTEXT & ROOT CAUSE (Bối cảnh & Phân tích nguyên nhân gốc)

### 1.1. Hiện tượng & Bối cảnh (Problem Statement)
* **Mô tả hành vi hiện tại (Current Behavior):** 
  * *[Mô tả chi tiết những gì đang xảy ra trong môi trường Brownfield. Kèm log trace, mã lỗi hoặc ảnh chụp màn hình nếu có]*
* **Hành vi mong muốn (Expected Behavior):**
  * *[Mô tả chính xác hệ thống phải phản ứng như thế nào sau khi áp dụng bản vá/tính năng]*
* **Môi trường tác động (Target Environment):** `[Production / Staging / Sandbox]`

### 1.2. Phân tích nguyên nhân kỹ thuật (Technical Root Cause)
* **Vị trí phát sinh:** `[Class / Function / Stored Procedure / Event Handler cụ thể]`
* **Cơ chế gây lỗi:**
  * *[Giải thích tại sao logic cũ bị lỗi: Race condition, Unhandled null, Nợ kỹ thuật do refactor dở dang, rò rỉ bộ nhớ, hoặc vi phạm contract]*
* **Lược đồ luồng dữ liệu lỗi (Error Flow Graph):**
  ```
  Caller -> [Component A] -> [Component B: BỊ LỖI Ở ĐÂY] -> Trả về 500 / Data Corruption
  ```

### 1.3. Đánh giá bán kính ảnh hưởng (Blast Radius Assessment)
* **Các service/module phụ thuộc trực tiếp (Direct Dependents):** `[Module X, Module Y]`
* **Rủi ro hồi quy tiềm tàng (Potential Regressions):** 
  * *[Liệt kê các luồng nghiệp vụ ngầm có thể bị vỡ nếu can thiệp sai]*

---

## 2. INTERFACE & DATA CONTRACTS (Hợp đồng giao diện & Dữ liệu)

### 2.1. Input / Output Schemas
*Tất cả cấu trúc dữ liệu phải định nghĩa rõ kiểu, ràng buộc bắt buộc (required/optional), và giá trị mặc định.*

```typescript
// Định dạng Contract máy đọc (TypeScript / JSON Schema / Pydantic / Protobuf)
export interface RequestPayload {
  readonly id: string;           // UUID v4 format
  readonly amount: number;        // Số dương > 0, tối đa 2 chữ số thập phân
  readonly currency: "VND" | "USD";
  readonly metadata?: Record<string, string>;
}

export interface ResponsePayload {
  readonly status: "SUCCESS" | "FAILED" | "PENDING";
  readonly transactionId: string;
  readonly executedAt: string;    // ISO 8601 UTC
  readonly errorCode?: ErrorCode;
}
```

### 2.2. Error Codes & Failure Modes
| Error Code | HTTP / RPC Status | Trigger Condition (Điều kiện kích hoạt) | User Message (Thông điệp) | Recovery Action (Cơ chế khắc phục) |
| :--- | :--- | :--- | :--- | :--- |
| `ERR_INVALID_PAYLOAD` | `400 Bad Request` | Payload thiếu field hoặc sai định dạng | "Dữ liệu yêu cầu không hợp lệ" | Client kiểm tra lại request |
| `ERR_INSUFFICIENT_BALANCE` | `422 Unprocessable`| Số dư tài khoản không đủ thanh toán | "Số dư không đủ thực hiện giao dịch"| Nạp thêm tiền |
| `ERR_UPSTREAM_TIMEOUT` | `504 Gateway Timeout`| Service bên thứ 3 không phản hồi sau 3s | "Hệ thống tạm thời bận, vui lòng thử lại" | Tự động retry với Exponential Backoff |

### 2.3. Thay đổi cơ sở dữ liệu (Database Changes)
<!-- Đánh dấu [X] vào lựa chọn tương ứng -->
- [ ] **KHÔNG CÓ THAY ĐỔI SCHEMA (No DB Changes)**
- [ ] **CÓ THAY ĐỔI SCHEMA (Yêu cầu viết rõ script migration tương thích ngược):**
  ```sql
  -- DDL Script (Chỉ cho phép thêm cột nullable hoặc bảng mới, CẤM DROP/ALTER COLUMN trực tiếp trên Brownfield)
  -- Migration UP:
  -- ALTER TABLE orders ADD COLUMN idempotency_key VARCHAR(64) NULL;
  -- CREATE INDEX idx_orders_idempotency ON orders(idempotency_key);
  ```

---

## 3. INVARIANTS (Checklist các điều kiện bất biến - CẤM VI PHẠM)

> **CẢNH BÁO CHO AI DEV AGENT:** Đây là các lồng sắt kỹ thuật tuyệt đối. Bất kỳ sự vi phạm nào đối với các điều kiện dưới đây sẽ dẫn đến việc loại bỏ toàn bộ code được sinh ra.

- [ ] **Bất biến 1 (Backward Compatibility):** Không thay đổi chữ ký (signature) của các public method hiện hữu. Không xóa hoặc đổi tên field trên REST/gRPC API.
- [ ] **Bất biến 2 (Dependency Freeze):** Tuyệt đối KHÔNG tự ý cài đặt thêm thư viện ngoài (external library) hoặc thay đổi version trong `package.json`, `pom.xml`, `requirements.txt`, `go.mod`.
- [ ] **Bất biến 3 (Performance SLA):** Thời gian phản hồi P99 $\le$ `[ví dụ: 200ms]`. Số lượng truy vấn DB $\le$ `[ví dụ: 3 queries / request]`. Cấm triệt để lỗi N+1 Query.
- [ ] **Bất biến 4 (Concurrency & Thread Safety):** Đảm bảo an toàn luồng khi xử lý đồng thời. Phải xử lý Idempotency (khóa phân tán / unique constraint) để ngăn trùng lặp dữ liệu.
- [ ] **Bất biến 5 (Security & Masking):** Không ghi log chứa dữ liệu nhạy cảm (PII, Passwords, Access Tokens, Credit Card). Không bypass Auth/AuthZ.
- [ ] **Bất biến 6 (Resource Cleanup):** Toàn bộ file stream, DB connection, socket descriptor phải được đóng trong block `finally` / `using` / `defer`.

---

## 4. FILE WHITELIST (Vùng can thiệp được cấp phép)

> **RÀO CHẮN AN TOÀN:** AI Dev Agent CHỈ ĐƯỢC PHÉP chỉnh sửa hoặc tạo mới các file có tên cụ thể trong danh sách dưới đây. Toàn bộ phần còn lại của repository ở trạng thái **READ-ONLY**.

### 4.1. Danh sách tệp được phép can thiệp (Allowed Files)
*Đường dẫn tương đối từ gốc repository:*
1. `src/modules/[module_name]/[subpath]/target_file_1.ts` - *[Lý do can thiệp]*
2. `src/modules/[module_name]/[subpath]/target_file_2.ts` - *[Lý do can thiệp]*
3. `src/modules/[module_name]/[subpath]/new_helper.ts` - *[File tạo mới nếu cần]*

### 4.2. Ranh giới cấm tuyệt đối (Forbidden Zones)
* `tests/**`: **CẤM GHI TUYỆT ĐỐI** đối với Developer Agent. Quyền ghi thư mục test chỉ thuộc về QA Agent.
* `config/**`, `.env*`: Cấm chỉnh sửa cấu hình hệ thống.
* `package.json`, `pnpm-lock.yaml`, `requirements.txt`: Cấm can thiệp manifest dependency.

---

## 5. ACCEPTANCE CRITERIA & BDD MATRIX (Bộ tiêu chí nghiệm thu)

*Agent QA sẽ dùng bảng kịch bản này để sinh bộ kiểm thử đối kháng (Adversarial Tests). Mọi kịch bản phải được map 1-1 với một test case cụ thể.*

### Kịch bản 1: Đường thuận lợi (Happy Path)
* **Mã kịch bản:** `TC-HAPPY-01`
* **Given (Bối cảnh):** Người dùng đã đăng nhập, số dư tài khoản là 500.000 VND.
* **When (Hành động):** Người dùng yêu cầu thanh toán hóa đơn giá trị 200.000 VND với mã giao dịch hợp lệ.
* **Then (Kết quả mong đợi):** 
  * Hệ thống trừ 200.000 VND khỏi số dư tài khoản.
  * Trả về HTTP 200 kèm `status: "SUCCESS"`.
  * Tạo bản ghi audit log giao dịch thành công.

### Kịch bản 2: Giá trị biên & Dữ liệu bất thường (Edge Cases & Boundary)
* **Mã kịch bản:** `TC-EDGE-01`
* **Given (Bối cảnh):** Số dư tài khoản chính xác bằng số tiền cần thanh toán (200.000 VND).
* **When (Hành động):** Gửi 2 request thanh toán 200.000 VND gần như cùng một mili-giây (Concurrent Race Condition).
* **Then (Kết quả mong đợi):** 
  * Đúng 1 request thành công (HTTP 200).
  * 1 request còn lại thất bại với `ERR_INSUFFICIENT_BALANCE` (HTTP 422).
  * Số dư cuối cùng phải bằng 0 VND, không bị âm tiền.

### Kịch bản 3: Kịch bản đối kháng & Phòng thủ (Adversarial / Failure Mode)
* **Mã kịch bản:** `TC-ADV-01`
* **Given (Bối cảnh):** Database hoặc downstream service bị timeout quá 3000ms.
* **When (Hành động):** Client gửi yêu cầu thanh toán.
* **Then (Kết quả mong đợi):** 
  * Hệ thống ngắt kết nối đúng 3000ms, không treo request.
  * Rollback toàn bộ transaction nội bộ nếu đã mở.
  * Trả về mã lỗi `ERR_UPSTREAM_TIMEOUT` (HTTP 504), không lộ stacktrace nội bộ ra ngoài.

### 5.1. Bảng đối soát nghiệm thu (Verification Mapping)
| Mã Kịch Bản | Phân loại | Tên hàm Test tương ứng | File Test dự kiến | Kết quả yêu cầu trước khi sửa code | Kết quả yêu cầu sau khi sửa code |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-HAPPY-01`| Unit / Int | `test_should_deduct_balance_and_return_success` | `tests/unit/test_payment.py` | **FAIL** (AssertionError) | **PASS** |
| `TC-EDGE-01` | Concurrency| `test_should_handle_concurrent_double_spending` | `tests/integration/test_race.py`| **FAIL** (AssertionError) | **PASS** |
| `TC-ADV-01`  | Resiliency | `test_should_abort_and_rollback_on_timeout`     | `tests/unit/test_resilience.py` | **FAIL** (AssertionError) | **PASS** |

---

## 6. PHÊ DUYỆT CỔNG 1 (GATE 1 SIGN-OFF)

| Vai trò | Người thực hiện | Chữ ký điện tử / Git Commit Hash | Ngày duyệt | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **Lead / Architect** | `[Tên Architect]` | `[commit-hash-of-spec]` | `YYYY-MM-DD` | **APPROVED & FROZEN** |

> *Sau khi Gate 1 được duyệt, chuyển file vào `specs/active/` và gắn nhãn status `SPEC_FROZEN`. Tiến hành kích hoạt Agent QA (Cổng 2).*

# WORKFLOW: REVERSE-SPEC (KHẢO CỔ MÃ NGUỒN VÀ TRÍCH XUẤT ĐẶC TẢ)

> **VAI TRÒ AGENT:** Codebase Archaeologist (Nhà khảo cổ mã nguồn)  
> **MỤC TIÊU:** Phân tích một module/tệp tin legacy phức tạp, thiếu tài liệu để trích xuất ra bản `Baseline Spec` hoàn chỉnh, chuẩn bị cho việc nâng cấp hoặc vá lỗi mà **TUYỆT ĐỐI KHÔNG LÀM THAY ĐỔI MỘT DÒNG CODE NÀO**.

---

## NGUYÊN TẮC BẤT DI BẤT DỊCH
1. **Chế độ Chỉ Đọc (Strictly Read-Only):** Agent không được phép chỉnh sửa, format lại hay xóa bất kỳ tệp tin nào trong repository trong suốt quá trình chạy workflow này.
2. **Quy luật Hyrum (Hyrum's Law):** *"Với một số lượng người dùng đủ lớn, mọi hành vi quan sát được của hệ thống (dù không có trong tài liệu hay là bug ngầm) đều sẽ được ai đó coi là tính năng."* Phải ghi nhận trung thực mọi hành vi hiện hữu, không tự ý coi hành vi lạ là bug để loại bỏ.

---

## QUY TRÌNH THỰC HIỆN TỪNG BƯỚC

### BƯỚC 1: XÁC ĐỊNH MỤC TIÊU VÀ BÁN KÍNH KHẢO SÁT
* Nhận đầu vào từ Kỹ sư: Tên tệp tin hoặc tên hàm legacy cần khảo cổ (ví dụ: `src/services/legacy_order_processor.py`).
* Lập chỉ mục các tệp tin phụ thuộc trực tiếp (Inbound callers và Outbound calls):
  ```bash
  # Tìm tất cả những nơi gọi đến module mục tiêu
  grep -rnw "src/" -e "LegacyOrderProcessor"
  ```

### BƯỚC 2: BÓC TÁCH CÂY CÚ PHÁP (AST) VÀ ĐỒ THỊ LỜI GỌI (CALL GRAPH)
Agent thực hiện phân tích cấu trúc tĩnh mà không chạy code:
1. **Public Interface Extraction:**
   * Liệt kê tất cả methods, public properties, types/interfaces được expose ra ngoài.
   * Xác định kiểu dữ liệu thực tế của tham số và giá trị trả về (kể cả kiểu ngầm định dynamic types).
2. **State & Side-Effects Mapping:**
   * Module này có lưu trữ trạng thái nội tại (stateful) không? Có biến module-level/global nào không?
   * Các tác vụ phụ (Side effects) ra bên ngoài: Có gọi DB không? Gửi HTTP request? Ghi file? Phát Message Queue? Có transaction lock nào không?
3. **Control Flow & Branching:**
   * Vẽ bản đồ cây quyết định: Có bao nhiêu nhánh `if/else`, `switch/case`, bao nhiêu loại exception có thể bị bắn ra?

### BƯỚC 3: PHÂN TÍCH LỊCH SỬ GIT VÀ VẾT TÍCH BỌC LỖI (GIT ARCHEOLOGY)
Đọc hiểu ngữ cảnh lịch sử để biết tại sao đoạn code lại trở nên phức tạp như hiện tại:
1. **Kiểm tra Git Blame & Commit Log của các đoạn code khó hiểu:**
   ```bash
   git log -p -S "special_tax_condition" -- path/to/legacy_file.py
   git log --oneline -n 20 -- path/to/legacy_file.py
   ```
2. **Trích xuất thông tin:**
   * Đoạn logic này được thêm vào từ ticket nào? Giải quyết sự cố gì trong quá khứ?
   * Đã có bao nhiêu lần vá lỗi (bug fix) diễn ra trên cùng một block code này? (Đây là dấu hiệu của điểm nóng rủi ro - Hotspot).

### BƯỚC 4: THIẾT LẬP BẢN ĐẶC TẢ HÀNH VI HIỆN TẠI (CHARACTERIZATION MATRIX)
Lập bảng ma trận hành vi hiện hữu (Current Behavior Matrix), phân loại rõ:
* **Hành vi danh nghĩa (Documented/Intentional Behavior):** Tính năng chính mà hàm được thiết kế để làm.
* **Hành vi ngầm (Hidden/Observed Quirks):** 
  * Ví dụ: *"Nếu truyền amount = 0, hàm không báo lỗi mà trả về string rỗng `""` thay vì null"*.
  * Ví dụ: *"Nếu DB timeout, hàm ngậm ngoại lệ và trả về mảng rỗng `[]`"*.
* Đánh dấu các hành vi này là **Ứng viên cho Characterization Tests** (Bộ test đóng băng hành vi cũ).

### BƯỚC 5: TỔNG HỢP VÀ XUẤT BẢN `SPEC-[ID].md`
Tạo một bản Spec mới từ mẫu [SPEC_TEMPLATE.md](file:///d:/Work/AI/specs/templates/SPEC_TEMPLATE.md) và lưu vào `specs/active/SPEC-[ID].md`:
1. Điền toàn bộ phần **1. Context & Root Cause** dựa trên kết quả khảo sát ở Bước 1–3.
2. Điền **2. Interface & Data Contracts** dựa trên AST ở Bước 2.
3. Điền **3. Invariants**: Đưa toàn bộ các hành vi ngầm đã phát hiện vào danh sách bất biến cần bảo toàn.
4. Xác định chính xác **4. File Whitelist** (chỉ giới hạn đúng các file cần chạm tới).
5. Soạn thảo **5. Acceptance Criteria**: Phân rõ kịch bản kiểm thử bảo tồn (Characterization) và kịch bản cho tính năng/bản vá mới (Delta Behavior).
6. Đặt trạng thái: `status: "DRAFT"`.

---

## TIÊU CHUẨN HOÀN THÀNH (DEFINITION OF DONE)
* [ ] Một file Spec mới được sinh ra tại `specs/active/SPEC-[TICKET_ID].md`.
* [ ] Không có bất kỳ file code nào trong repo bị thay đổi (`git status --porcelain` không có diff).
* [ ] Kỹ sư con người (Lead/Architect) được thông báo để bắt đầu bước phê duyệt **Cổng 1 (Human Gate Sign-off)**.

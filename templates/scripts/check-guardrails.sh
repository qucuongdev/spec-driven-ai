#!/usr/bin/env bash

# ==============================================================================
# SCRIPT: check-guardrails.sh
# MỤC ĐÍCH: Kiểm soát rào chắn kỹ thuật (Guardrail Enforcement) cho Spec-Driven AI-DLC.
# TỰ ĐỘNG CHẶN:
#   1. Bất kỳ tệp mã nguồn logic nào bị sửa đổi nằm ngoài "File Whitelist" của Spec.
#   2. Bất kỳ sự can thiệp trái phép nào vào thư mục "tests/" khi ở vai trò Developer.
#   3. Vượt quá ngân sách tệp can thiệp (Max File Touch Budget).
#   4. Tự tiện sửa đổi file quản lý dependency (package.json, requirements.txt, v.v.).
# TƯƠNG THÍCH: Git Bash (Windows), macOS, Linux.
# ==============================================================================

set -euo pipefail

# --- MÀU SẮC ĐẦU RA ANSI ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${CYAN}${BOLD}======================================================${NC}"
echo -e "${CYAN}${BOLD}  SPEC-DRIVEN AI-DLC: HÀNG RÀO KIỂM SOÁT AN TOÀN      ${NC}"
echo -e "${CYAN}${BOLD}======================================================${NC}"

# --- BƯỚC 1: XÁC MINH MÔI TRƯỜNG GIT ---
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo -e "${RED}[LỖI BẢO VỆ] Không tìm thấy Git repository. Khung kiểm soát yêu cầu Git để theo dõi diff.${NC}"
  exit 1
fi

# --- BƯỚC 2: TÌM KIẾM BẢN ĐẶC TẢ HOẠT ĐỘNG (ACTIVE SPEC) ---
SPEC_FILE=""

# Kiểm tra nếu người dùng truyền trực tiếp đường dẫn spec qua tham số
if [ $# -ge 1 ] && [ -f "$1" ]; then
  SPEC_FILE="$1"
else
  # Tìm file .md mới nhất trong thư mục specs/active/
  if [ -d "specs/active" ]; then
    SPEC_FILE=$(find specs/active -maxdepth 1 -name "*.md" ! -name "SPEC_INCONSISTENCY_REPORT.md" -type f 2>/dev/null | head -n 1 || true)
  fi
fi

if [ -z "$SPEC_FILE" ] || [ ! -f "$SPEC_FILE" ]; then
  echo -e "${YELLOW}[CẢNH BÁO] Không tìm thấy bản Spec kích hoạt trong 'specs/active/'.${NC}"
  echo -e "${YELLOW}           Vui lòng chỉ định: bash scripts/check-guardrails.sh <đường_dẫn_spec>${NC}"
  echo -e "${YELLOW}           Tạm thời kiểm tra các vi phạm chung (dependency manifests, tests)...${NC}"
fi

# --- BƯỚC 3: TRÍCH XUẤT THÔNG TIN TỪ SPEC (NẾU CÓ) ---
WHITELIST=()
MAX_BUDGET=5
SPEC_STATUS="UNKNOWN"

if [ -n "$SPEC_FILE" ] && [ -f "$SPEC_FILE" ]; then
  echo -e "${BLUE}[THÔNG TIN] Đang đọc bản đặc tả: ${BOLD}${SPEC_FILE}${NC}"
  
  # Lấy trạng thái Spec (loại bỏ khoảng trắng và carriage return \r)
  SPEC_STATUS=$(grep -E '^[[:space:]]*status:' "$SPEC_FILE" 2>/dev/null | head -n 1 | awk -F '"' '{print $2}' | tr -d '\r' || true)
  if [ -z "$SPEC_STATUS" ]; then
    SPEC_STATUS=$(grep -E '^[[:space:]]*status:' "$SPEC_FILE" 2>/dev/null | head -n 1 | awk '{print $2}' | tr -d '\r' || true)
  fi
  echo -e "${BLUE}[THÔNG TIN] Trạng thái Spec: ${BOLD}${SPEC_STATUS:-UNKNOWN}${NC}"

  # Lấy max_file_touch_budget
  PARSED_BUDGET=$(grep -E '^[[:space:]]*max_file_touch_budget:' "$SPEC_FILE" 2>/dev/null | head -n 1 | awk '{print $2}' | tr -d '\r' || true)
  if [[ "$PARSED_BUDGET" =~ ^[0-9]+$ ]]; then
    MAX_BUDGET=$PARSED_BUDGET
  fi
  echo -e "${BLUE}[THÔNG TIN] Hạn mức số file can thiệp tối đa: ${BOLD}${MAX_BUDGET}${NC}"

  # Trích xuất File Whitelist từ Section 4
  # Hỗ trợ cả định dạng:
  # 1. `path/to/file`
  # 2. `path/to/file` - Mô tả
  # - path/to/file
  IN_WHITELIST_SECTION=false
  while IFS= read -r line || [ -n "$line" ]; do
    # Bỏ ký tự \r của Windows
    line=$(echo "$line" | tr -d '\r')

    # Bắt đầu section whitelist
    if echo "$line" | grep -iqE '^##[[:space:]]+4\.[[:space:]]+FILE WHITELIST' || echo "$line" | grep -iqE '^###[[:space:]]+4\.1'; then
      IN_WHITELIST_SECTION=true
      continue
    fi

    # Kết thúc section whitelist khi gặp Section 5 hoặc header cấp 2 khác
    if $IN_WHITELIST_SECTION && echo "$line" | grep -qE '^##[[:space:]]+[5-9]\.'; then
      IN_WHITELIST_SECTION=false
      break
    fi

    if $IN_WHITELIST_SECTION; then
      # Bóc tách đường dẫn nằm trong dấu backtick `path/to/file`
      if echo "$line" | grep -q '`'; then
        EXTRACTED_PATH=$(echo "$line" | sed -n 's/.*`\([^`]*\)`.*/\1/p' | tr -d ' ')
        # Loại bỏ nếu là keyword markdown hoặc regex pattern
        if [[ -n "$EXTRACTED_PATH" && ! "$EXTRACTED_PATH" =~ \*\* && ! "$EXTRACTED_PATH" =~ ^(npm|pip|yarn) ]]; then
          WHITELIST+=("$EXTRACTED_PATH")
        fi
      fi
    fi
  done < "$SPEC_FILE"

  echo -e "${BLUE}[THÔNG TIN] Danh sách File Whitelist được cấp phép (${#WHITELIST[@]} files):${NC}"
  for f in "${WHITELIST[@]}"; do
    echo -e "  ${GREEN}✓ ${f}${NC}"
  done
fi

# --- BƯỚC 4: THU THẬP TẤT CẢ FILE ĐANG BỊ SỬA ĐỔI / THÊM MỚI TRONG GIT ---
# Bao gồm cả Staged, Unstaged, và Untracked files
CHANGED_FILES=()
while IFS= read -r file || [ -n "$file" ]; do
  [ -z "$file" ] && continue
  # Chuẩn hóa đường dẫn (thay \ bằng / cho môi trường Windows)
  file=$(echo "$file" | tr '\\' '/' | tr -d '\r')
  CHANGED_FILES+=("$file")
done < <(git status --porcelain=v1 2>/dev/null | awk '{print $2}' || true)

if [ ${#CHANGED_FILES[@]} -eq 0 ]; then
  echo -e "${GREEN}✓ Trạng thái Git sạch sẽ. Không có file nào bị chỉnh sửa.${NC}"
  exit 0
fi

echo -e "\n${CYAN}--- ĐANG KIỂM TRA CÁC THAY ĐỔI HIỆN TẠI (${#CHANGED_FILES[@]} files) ---${NC}"

# --- BƯỚC 5: TIẾN HÀNH KIỂM SOÁT HÀNG RÀO AN TOÀN ---
VIOLATIONS=0
LOGIC_FILE_COUNT=0

# Danh sách các file cấu hình phụ thuộc bị cấm sửa đổi tự ý
FORBIDDEN_DEPENDENCY_FILES=(
  "package.json"
  "package-lock.json"
  "yarn.lock"
  "pnpm-lock.yaml"
  "requirements.txt"
  "Pipfile"
  "Pipfile.lock"
  "poetry.lock"
  "pyproject.toml"
  "pom.xml"
  "build.gradle"
  "go.mod"
  "go.sum"
  "Cargo.toml"
  "Cargo.lock"
)

for file in "${CHANGED_FILES[@]}"; do
  # 1. Bỏ qua các file tài liệu spec, living adr và rule nội bộ của Agent
  if [[ "$file" =~ ^specs/ ]] || [[ "$file" =~ ^\.agents/ ]] || [[ "$file" =~ ^scripts/check-guardrails\.sh$ ]]; then
    echo -e "  [BỎ QUA - METADATA]: ${file}"
    continue
  fi

  # 2. Kiểm tra cấm tự ý sửa file Dependency Manifests
  BASENAME_FILE=$(basename "$file")
  for dep_file in "${FORBIDDEN_DEPENDENCY_FILES[@]}"; do
    if [ "$BASENAME_FILE" == "$dep_file" ]; then
      # Kiểm tra xem file này có được liệt kê rõ trong Whitelist không
      IS_DEP_WHITELISTED=false
      for w in "${WHITELIST[@]}"; do
        if [ "$file" == "$w" ]; then
          IS_DEP_WHITELISTED=true
          break
        fi
      done

      if ! $IS_DEP_WHITELISTED; then
        echo -e "${RED}[VI PHẠM BẢO VỆ - ĐIỀU 2] Cấm tự ý sửa đổi file dependency: ${file}${NC}"
        echo -e "${RED}  -> Hệ thống đang đóng băng phụ thuộc (Dependency Freeze). Không được tự ý cài thêm thư viện.${NC}"
        VIOLATIONS=$((VIOLATIONS + 1))
      fi
    fi
  done

  # 3. Kiểm tra bảo vệ thư mục tests/ (Adversarial Rule)
  # Nếu trạng thái là TESTS_GENERATED, IMPLEMENTING hoặc VERIFIED, CẤM SỬA TESTS
  if [[ "$file" =~ ^tests/ ]] || [[ "$file" =~ ^test/ ]] || [[ "$file" =~ ^__tests__/ ]] || [[ "$file" =~ \.spec\. ]] || [[ "$file" =~ \.test\. ]]; then
    if [ "$SPEC_STATUS" == "TESTS_GENERATED" ] || [ "$SPEC_STATUS" == "IMPLEMENTING" ] || [ "$SPEC_STATUS" == "VERIFIED" ]; then
      echo -e "${RED}[VI PHẠM ĐỐI KHÁNG - RULE 02] Phát hiện sửa đổi trái phép trong thư mục test: ${file}${NC}"
      echo -e "${RED}  -> Thư mục tests/ đã bị KHÓA (Status: ${SPEC_STATUS}). Cấm Developer Agent sửa test để ép pass.${NC}"
      VIOLATIONS=$((VIOLATIONS + 1))
      continue
    else
      # Nếu đang ở pha sinh test của QA Agent, cho phép sửa test
      echo -e "  [CHO PHÉP - QA PHASE]: ${file}"
      continue
    fi
  fi

  # 4. Kiểm tra File Whitelist đối với mã nguồn logic
  LOGIC_FILE_COUNT=$((LOGIC_FILE_COUNT + 1))
  IS_IN_WHITELIST=false

  if [ ${#WHITELIST[@]} -gt 0 ]; then
    for w in "${WHITELIST[@]}"; do
      if [ "$file" == "$w" ]; then
        IS_IN_WHITELIST=true
        break
      fi
    done

    if ! $IS_IN_WHITELIST; then
      echo -e "${RED}[VI PHẠM RANH GIỚI - RULE 01] File nằm ngoài Whitelist: ${file}${NC}"
      echo -e "${RED}  -> Toàn bộ repository ở trạng thái Read-only ngoại trừ các file trong Whitelist.${NC}"
      VIOLATIONS=$((VIOLATIONS + 1))
    else
      echo -e "  ${GREEN}[HỢP LỆ - TRONG WHITELIST]: ${file}${NC}"
    fi
  else
    echo -e "  ${YELLOW}[CẢNH BÁO - CHƯA RÕ WHITELIST]: ${file}${NC}"
  fi
done

# --- BƯỚC 6: KIỂM TRA HẠN MỨC SỐ FILE LOGIC (FILE TOUCH BUDGET) ---
echo -e "\n${BLUE}[THÔNG TIN] Tổng số file logic bị chỉnh sửa: ${LOGIC_FILE_COUNT} / ${MAX_BUDGET} (Cho phép)${NC}"
if [ $LOGIC_FILE_COUNT -gt $MAX_BUDGET ]; then
  echo -e "${RED}[VI PHẠM ATOMIC PR] Số lượng file can thiệp (${LOGIC_FILE_COUNT}) vượt quá hạn mức tối đa (${MAX_BUDGET})!${NC}"
  echo -e "${RED}  -> Để tránh nợ kỹ thuật và gãy hệ thống Brownfield, hãy chia nhỏ tác vụ thành các Micro-Specs.${NC}"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# --- BƯỚC 7: TỔNG KẾT & MÃ THOÁT ---
echo -e "${CYAN}======================================================${NC}"
if [ $VIOLATIONS -gt 0 ]; then
  echo -e "${RED}${BOLD}❌ THẤT BẠI: Phát hiện ${VIOLATIONS} vi phạm rào chắn an toàn!${NC}"
  echo -e "${RED}Vui lòng hoàn tác (git checkout / git restore) các file vi phạm trước khi tiếp tục.${NC}"
  exit 1
else
  echo -e "${GREEN}${BOLD}✅ THÀNH CÔNG: Toàn bộ thay đổi tuân thủ nghiêm ngặt Spec & Guardrails!${NC}"
  echo -e "${GREEN}Mã nguồn sẵn sàng cho vòng lặp kiểm chứng tiếp theo.${NC}"
  exit 0
fi

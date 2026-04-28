#!/usr/bin/env bash
# 打包脚本 (macOS / Linux)
# 用法:
#   ./pack.sh              # 干净包，不含数据库和上传文件
#   ./pack.sh --with-data  # 包含现有数据库和上传文件（迁移已有数据用）

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[PACK]${NC} $1"; }
warn() { echo -e "${YELLOW}[PACK]${NC} $1"; }

WITH_DATA=false
[[ "$1" == "--with-data" ]] && WITH_DATA=true

DATE=$(date +%Y%m%d)
OUT_NAME="live-audition-scoring-${DATE}"
OUT_ZIP="${OUT_NAME}.zip"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log "开始打包 Live Audition Scoring..."
[[ "$WITH_DATA" == "true" ]] && warn "包含模式: 带数据 (--with-data)" || log "包含模式: 干净包"

TMP_DIR="$(mktemp -d)"
PKG_DIR="${TMP_DIR}/${OUT_NAME}"
mkdir -p "$PKG_DIR"

log "复制源代码..."
rsync -a \
  --exclude='node_modules/' \
  --exclude='.next/' \
  --exclude='.git/' \
  --exclude='uploads/' \
  --exclude='dev.db' \
  --exclude='dev.db-shm' \
  --exclude='dev.db-wal' \
  --exclude='*.log' \
  --exclude='next-env.d.ts' \
  --exclude='*.tsbuildinfo' \
  --exclude='AGENTS.md' \
  --exclude="live-audition-scoring-*.zip" \
  "${SCRIPT_DIR}/" "${PKG_DIR}/"

# 按需带数据
if [[ "$WITH_DATA" == "true" ]]; then
  log "复制数据库..."
  if [[ -f "${SCRIPT_DIR}/dev.db" ]]; then
    cp "${SCRIPT_DIR}/dev.db" "${PKG_DIR}/dev.db"
  else
    warn "未找到 dev.db，跳过"
  fi

  log "复制上传文件..."
  if [[ -d "${SCRIPT_DIR}/uploads" ]]; then
    rsync -a "${SCRIPT_DIR}/uploads/" "${PKG_DIR}/uploads/"
  else
    warn "未找到 uploads/ 目录，跳过"
  fi
fi

# 始终创建空 uploads 目录
mkdir -p "${PKG_DIR}/uploads"

# 脚本权限
chmod +x "${PKG_DIR}/start.sh" 2>/dev/null || true
chmod +x "${PKG_DIR}/pack.sh"  2>/dev/null || true

# 写干净的 .env（使用项目实际路径）
cat > "${PKG_DIR}/.env" <<'EOF'
DATABASE_URL="file:./dev.db"
EOF

log "生成 zip 包..."
cd "$TMP_DIR"
zip -r "${SCRIPT_DIR}/${OUT_ZIP}" "${OUT_NAME}" -x "*.DS_Store" "__MACOSX/*" > /dev/null
rm -rf "$TMP_DIR"

SIZE=$(du -sh "${SCRIPT_DIR}/${OUT_ZIP}" | cut -f1)
log "打包完成: ${OUT_ZIP} (${SIZE})"
echo ""
echo "  收件方使用方式:"
echo "    macOS / Linux:  unzip ${OUT_ZIP} && cd ${OUT_NAME} && ./start.sh"
echo "    Windows:        解压后双击 start.bat"
echo ""

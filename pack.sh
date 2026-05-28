#!/usr/bin/env bash
# 打包脚本 (macOS / Linux) — 生产模式发包
#
# 默认行为：
#   • 在打包机上执行 next build（产出 .next/）一并打入包内，目标机无需再 build
#   • 自动携带当前 dev.db 与 uploads/（演示/迁移数据随包带走）
#   • 不打入 node_modules：目标机首次启动会自动按本机平台安装生产依赖
#
# 用法:
#   ./pack.sh               # 默认：含 dev.db + uploads + .next/
#   ./pack.sh --no-data     # 干净包：不带 dev.db / uploads
#   ./pack.sh --skip-build  # 跳过 next build（仅适合本地已构建好的情况）

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[PACK]${NC} $1"; }
warn() { echo -e "${YELLOW}[PACK]${NC} $1"; }
fail() { echo -e "${RED}[PACK] ERROR:${NC} $1"; exit 1; }

WITH_DATA=true
SKIP_BUILD=false
for arg in "$@"; do
  case "$arg" in
    --no-data)    WITH_DATA=false ;;
    --skip-build) SKIP_BUILD=true ;;
    --with-data)  WITH_DATA=true ;;  # 兼容旧参数
    *) warn "未知参数: $arg" ;;
  esac
done

DATE=$(date +%Y%m%d)
OUT_NAME="live-audition-scoring-${DATE}"
OUT_ZIP="${OUT_NAME}.zip"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log "开始打包 Live Audition Scoring..."
$WITH_DATA  && log "数据模式: 带当前 dev.db + uploads/" || warn "数据模式: 干净包（不带 dev.db / uploads）"
$SKIP_BUILD && warn "构建模式: 跳过 next build" || log "构建模式: 执行 next build"

# ---------- 校验工具 ----------
command -v node >/dev/null 2>&1 || fail "未找到 node，请先安装 Node.js 18+"
command -v npm  >/dev/null 2>&1 || fail "未找到 npm"
command -v zip  >/dev/null 2>&1 || fail "未找到 zip 命令"

# ---------- 安装依赖（构建用） ----------
cd "$SCRIPT_DIR"
if [ ! -d "node_modules" ]; then
  log "首次打包，安装依赖（约 1-2 分钟）..."
  npm install --legacy-peer-deps
fi

# ---------- 生产构建 ----------
if [ "$SKIP_BUILD" != "true" ]; then
  log "执行 next build（生成 .next/）..."
  npm run build
fi
[ -d ".next" ] || fail ".next 目录不存在，请先执行 npm run build（或去掉 --skip-build）"

# ---------- 准备打包目录 ----------
TMP_DIR="$(mktemp -d)"
PKG_DIR="${TMP_DIR}/${OUT_NAME}"
mkdir -p "$PKG_DIR"

log "复制源码与配置..."
rsync -a \
  --exclude='node_modules/' \
  --exclude='.next/cache/' \
  --exclude='.git/' \
  --exclude='uploads/' \
  --exclude='dev.db' \
  --exclude='dev.db-shm' \
  --exclude='dev.db-wal' \
  --exclude='*.log' \
  --exclude='*.tsbuildinfo' \
  --exclude='AGENTS.md' \
  --exclude='PLAN.md' \
  --exclude="live-audition-scoring-*.zip" \
  "${SCRIPT_DIR}/" "${PKG_DIR}/"

# 数据：默认带，可关
if [ "$WITH_DATA" = "true" ]; then
  if [ -f "${SCRIPT_DIR}/dev.db" ]; then
    log "复制 dev.db ..."
    cp "${SCRIPT_DIR}/dev.db" "${PKG_DIR}/dev.db"
  else
    warn "未找到 dev.db，跳过（目标机首次启动会自动 migrate + seed）"
  fi
  if [ -d "${SCRIPT_DIR}/uploads" ]; then
    log "复制 uploads/ ..."
    rsync -a "${SCRIPT_DIR}/uploads/" "${PKG_DIR}/uploads/"
  fi
fi

# 始终预留 uploads 目录，避免 next 运行时报错
mkdir -p "${PKG_DIR}/uploads"

# 脚本权限
chmod +x "${PKG_DIR}/start.sh" 2>/dev/null || true
chmod +x "${PKG_DIR}/pack.sh"  2>/dev/null || true

# 写最小化 .env（如目标机已存在 .env 将覆盖；用户可在解压后调整）
cat > "${PKG_DIR}/.env" <<'EOF'
DATABASE_URL="file:./dev.db"
# 生产模式启动端口，可在目标机修改
PORT=3000
EOF

# 打包说明文档（可选阅读）
cat > "${PKG_DIR}/DEPLOY.md" <<'EOF'
# Live Audition Scoring — 部署说明

本包采用生产模式（next start），首次启动会按目标机系统重新安装生产依赖并重建原生模块（better-sqlite3 等），随后即可直接运行。

## 一键启动
- **macOS / Linux**：解压后 `cd <目录>` 并执行 `./start.sh`
- **Windows**：解压后双击 `start.bat`

## 系统要求
- Node.js 18 或更高版本（https://nodejs.org）
- 首次启动需联网下载生产依赖（约 100-200 MB）

## 端口
默认 3000。如被占用会自动尝试 3001；或在 `.env` 中显式设置 `PORT`。

## 数据
- 包内带的 `dev.db` 与 `uploads/` 即为当前演示数据。首次启动若数据已存在则跳过 seed。
- 如需重新初始化，删除 `dev.db` 与 `uploads/` 后再启动，会自动 migrate + seed。

## 升级/打补丁
覆盖式更新源码与 `.next/` 后重新启动即可。`dev.db` 与 `uploads/` 保持原样。
EOF

log "生成 zip 包..."
cd "$TMP_DIR"
zip -rq "${SCRIPT_DIR}/${OUT_ZIP}" "${OUT_NAME}" -x "*.DS_Store" "__MACOSX/*"
rm -rf "$TMP_DIR"

SIZE=$(du -sh "${SCRIPT_DIR}/${OUT_ZIP}" | cut -f1)
log "打包完成: ${OUT_ZIP} (${SIZE})"
echo ""
echo "  目标机使用方式："
echo "    macOS / Linux:  unzip ${OUT_ZIP} && cd ${OUT_NAME} && ./start.sh"
echo "    Windows:        解压后双击 start.bat"
echo ""

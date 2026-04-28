#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[LAS]${NC} $1"; }
warn() { echo -e "${YELLOW}[LAS]${NC} $1"; }
fail() { echo -e "${RED}[LAS] ERROR:${NC} $1"; exit 1; }

echo ""
echo "  Live Audition Scoring"
echo "  ====================="
echo ""

# ---------- Node.js ----------
if ! command -v node &>/dev/null; then
  fail "Node.js 未安装。请访问 https://nodejs.org 安装 Node.js 18 或更高版本。"
fi

NODE_MAJOR=$(node -e "process.stdout.write(String(process.versions.node.split('.')[0]))")
if [ "$NODE_MAJOR" -lt 18 ]; then
  fail "Node.js 版本过低（当前 $(node -v)），需要 v18 或更高版本。"
fi
log "Node.js $(node -v) ✓"

# ---------- npm ----------
if ! command -v npm &>/dev/null; then
  fail "npm 未找到，请重新安装 Node.js。"
fi
log "npm $(npm -v) ✓"

# ---------- 依赖安装 ----------
if [ ! -d "node_modules" ]; then
  log "首次运行，正在安装依赖（约需 1-2 分钟）..."
  npm install --legacy-peer-deps
else
  # 检查 package.json 是否比 node_modules 新（依赖有更新）
  if [ "package.json" -nt "node_modules/.package-lock.json" ] 2>/dev/null; then
    warn "检测到依赖变更，正在更新..."
    npm install --legacy-peer-deps
  fi
fi
log "依赖已就绪 ✓"

# ---------- 环境变量 ----------
if [ ! -f ".env" ]; then
  log "生成 .env 文件..."
  cat > .env <<'ENVEOF'
DATABASE_URL="file:./dev.db"
ENVEOF
fi

# ---------- 数据库迁移 ----------
log "检查数据库..."
if ! npx prisma migrate deploy --schema=prisma/schema.prisma 2>/dev/null; then
  warn "migrate deploy 失败，尝试 migrate dev（开发模式）..."
  npx prisma migrate dev --name init --schema=prisma/schema.prisma 2>/dev/null || true
fi
log "数据库结构已同步 ✓"

# ---------- 生成 Prisma Client ----------
npx prisma generate --schema=prisma/schema.prisma 2>/dev/null
log "Prisma Client 已生成 ✓"

# ---------- 数据库初始数据 ----------
DB_PATH="./dev.db"
# 通过检查 Session 表是否有数据来判断是否需要 seed
NEED_SEED=false
if [ ! -f "$DB_PATH" ]; then
  NEED_SEED=true
else
  COUNT=$(node -e "
    const {PrismaBetterSqlite3} = require('@prisma/adapter-better-sqlite3');
    const {PrismaClient} = require('@prisma/client');
    const adapter = new PrismaBetterSqlite3({url: 'file:./dev.db'});
    const prisma = new PrismaClient({adapter});
    prisma.session.count().then(n => { process.stdout.write(String(n)); prisma.\$disconnect(); });
  " 2>/dev/null || echo "0")
  if [ "$COUNT" = "0" ]; then
    NEED_SEED=true
  fi
fi

if [ "$NEED_SEED" = "true" ]; then
  log "写入初始数据（场次、角色、二维码）..."
  npx tsx prisma/seed.ts
  log "初始数据已写入 ✓"
else
  log "数据库已有数据，跳过 seed ✓"
fi

# ---------- 上传目录 ----------
mkdir -p uploads
log "uploads/ 目录已就绪 ✓"

# ---------- 端口检测 ----------
PORT=${PORT:-3000}
if lsof -i ":$PORT" -sTCP:LISTEN &>/dev/null 2>&1; then
  warn "端口 $PORT 已被占用，尝试 $((PORT+1))..."
  PORT=$((PORT+1))
fi

# ---------- 启动 ----------
echo ""
log "启动服务，访问地址："
echo ""
echo "    本机:    http://localhost:$PORT"
echo "    局域网:  http://$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo '<本机IP>'):$PORT"
echo ""
echo "  角色入口："
echo "    导演打分:    http://localhost:$PORT/director/login"
echo "    甄选团队:    http://localhost:$PORT/casting/login"
echo "    二维码管理:  http://localhost:$PORT/admin/qrcodes"
echo ""
echo "  按 Ctrl+C 停止服务"
echo ""

npx next dev -p "$PORT"

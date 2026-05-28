#!/usr/bin/env bash
# Live Audition Scoring — 生产模式启动脚本（macOS / Linux）
#
# 行为：
#   1. 校验 Node.js 18+
#   2. 仅安装生产依赖（首次会重建 better-sqlite3 等原生模块）
#   3. 若包内不带 dev.db / 数据库为空，则 migrate + seed
#   4. 用 next start 启动生产服务（不是 dev 热重载）
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[LAS]${NC} $1"; }
warn() { echo -e "${YELLOW}[LAS]${NC} $1"; }
fail() { echo -e "${RED}[LAS] ERROR:${NC} $1"; exit 1; }

cd "$(dirname "${BASH_SOURCE[0]}")"

echo ""
echo "  Live Audition Scoring (Production)"
echo "  =================================="
echo ""

# ---------- Node.js ----------
command -v node >/dev/null 2>&1 || fail "Node.js 未安装，请访问 https://nodejs.org 安装 18+ 版本。"
NODE_MAJOR=$(node -e "process.stdout.write(String(process.versions.node.split('.')[0]))")
[ "$NODE_MAJOR" -ge 18 ] || fail "Node.js 版本过低（当前 $(node -v)），需要 v18+。"
log "Node.js $(node -v) ✓"

command -v npm >/dev/null 2>&1 || fail "未找到 npm。"
log "npm $(npm -v) ✓"

# ---------- 加载 .env ----------
if [ ! -f ".env" ]; then
  log "生成默认 .env ..."
  cat > .env <<'ENVEOF'
DATABASE_URL="file:./dev.db"
PORT=3000
ENVEOF
fi
# PORT: env var takes precedence, then .env file, then default 3000
if [ -z "$PORT" ]; then
  PORT=$(grep -E "^PORT=" .env 2>/dev/null | tail -1 | sed -E 's/^PORT=//; s/"//g' || true)
fi
PORT=${PORT:-3000}

# ---------- 生产依赖 ----------
NEED_INSTALL=false
if [ ! -d "node_modules" ]; then
  NEED_INSTALL=true
elif [ "package.json" -nt "node_modules/.package-lock.json" ] 2>/dev/null; then
  warn "检测到 package.json 变更，重新安装依赖..."
  NEED_INSTALL=true
fi

if [ "$NEED_INSTALL" = "true" ]; then
  log "安装生产依赖（首次约 1-2 分钟，会按本机平台重建原生模块）..."
  if [ -f "package-lock.json" ]; then
    npm ci --omit=dev --legacy-peer-deps 2>/dev/null || npm install --omit=dev --legacy-peer-deps
  else
    npm install --omit=dev --legacy-peer-deps
  fi
fi
log "依赖已就绪 ✓"

# ---------- Prisma Client（按本机平台生成） ----------
log "生成 Prisma Client ..."
npx prisma generate --schema=prisma/schema.prisma >/dev/null 2>&1 || true

# ---------- 数据库 ----------
DB_PATH="./dev.db"
NEED_MIGRATE=false
NEED_SEED=false

if [ ! -f "$DB_PATH" ]; then
  NEED_MIGRATE=true
  NEED_SEED=true
else
  # 库存在但若 Session 表为空也补 seed
  COUNT=$(node -e "
    try {
      const {PrismaBetterSqlite3} = require('@prisma/adapter-better-sqlite3');
      const {PrismaClient} = require('@prisma/client');
      const adapter = new PrismaBetterSqlite3({url: 'file:./dev.db'});
      const prisma = new PrismaClient({adapter});
      prisma.session.count().then(n => { process.stdout.write(String(n)); prisma.\$disconnect(); }).catch(()=>{ process.stdout.write('-1'); });
    } catch(e) { process.stdout.write('-1'); }
  " 2>/dev/null || echo "-1")
  if [ "$COUNT" = "-1" ]; then
    # 表不存在或客户端报错 → 跑 migrate
    NEED_MIGRATE=true
    NEED_SEED=true
  elif [ "$COUNT" = "0" ]; then
    NEED_SEED=true
  fi
fi

if [ "$NEED_MIGRATE" = "true" ]; then
  log "应用数据库迁移 ..."
  npx prisma migrate deploy --schema=prisma/schema.prisma || warn "migrate deploy 失败，尝试 migrate dev"
fi

if [ "$NEED_SEED" = "true" ]; then
  log "写入初始数据（场次/角色/二维码）..."
  npx tsx prisma/seed.ts
  log "初始数据已写入 ✓"
else
  log "数据库已存在数据，跳过 seed ✓"
fi

# ---------- uploads ----------
mkdir -p uploads
log "uploads/ 目录已就绪 ✓"

# ---------- 端口检测 ----------
if command -v lsof >/dev/null 2>&1; then
  if lsof -i ":$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    warn "端口 $PORT 已被占用，尝试 $((PORT+1))..."
    PORT=$((PORT+1))
  fi
fi

# ---------- 本机 IP（用于局域网访问提示） ----------
LAN_IP="localhost"
if command -v ipconfig >/dev/null 2>&1; then
  LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
fi
if [ -z "$LAN_IP" ] && command -v hostname >/dev/null 2>&1; then
  LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi
[ -z "$LAN_IP" ] && LAN_IP="<本机IP>"

# ---------- 启动 ----------
echo ""
log "启动生产服务..."
echo ""
echo "    本机:    http://localhost:$PORT"
echo "    局域网:  http://$LAN_IP:$PORT"
echo ""
echo "  角色入口："
echo "    导演登录:     http://localhost:$PORT/director/login"
echo "    甄选团队:     http://localhost:$PORT/casting/login"
echo "    Casting Book: http://localhost:$PORT/casting/book"
echo "    二维码管理:   http://localhost:$PORT/admin/qrcodes"
echo ""
echo "  按 Ctrl+C 停止服务"
echo ""

exec npx next start -p "$PORT"

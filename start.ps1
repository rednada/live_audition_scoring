# Live Audition Scoring — 生产模式启动脚本（Windows PowerShell）
#
# 行为：
#   1. 校验 Node.js 18+
#   2. 仅安装生产依赖（首次会重建 better-sqlite3 等原生模块）
#   3. 若包内不带 dev.db / 数据库为空，则 migrate + seed
#   4. 用 next start 启动生产服务

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Log  { Write-Host "[LAS] $args" -ForegroundColor Green }
function Warn { Write-Host "[LAS] $args" -ForegroundColor Yellow }
function Fail { Write-Host "[LAS] ERROR: $args" -ForegroundColor Red; Read-Host "按 Enter 退出"; exit 1 }

Write-Host ""
Write-Host "  Live Audition Scoring (Production)"
Write-Host "  =================================="
Write-Host ""

# ---------- Node.js ----------
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Fail "Node.js 未安装，请访问 https://nodejs.org 安装 18+ 版本。"
}
$nodeMajor = node -e "process.stdout.write(String(process.versions.node.split('.')[0]))"
if ([int]$nodeMajor -lt 18) { Fail "Node.js 版本过低（当前 $(node -v)），需要 v18+。" }
Log "Node.js $(node -v) ✓"

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Fail "未找到 npm。" }
Log "npm $(npm -v) ✓"

# ---------- 加载 .env ----------
if (-not (Test-Path ".env")) {
    Log "生成默认 .env ..."
    @'
DATABASE_URL="file:./dev.db"
PORT=3000
'@ | Set-Content ".env" -Encoding UTF8
}
# PORT: env var takes precedence, then .env file, then default 3000
$port = 3000
if ($env:PORT -and ($env:PORT -match '^\d+$')) {
    $port = [int]$env:PORT
} else {
    $envPort = Get-Content ".env" -ErrorAction SilentlyContinue | Where-Object { $_ -match '^PORT=' } | Select-Object -Last 1
    if ($envPort) {
        $val = ($envPort -replace '^PORT=','') -replace '"',''
        if ($val -match '^\d+$') { $port = [int]$val }
    }
}

# ---------- 生产依赖 ----------
$needInstall = $false
if (-not (Test-Path "node_modules")) {
    $needInstall = $true
} else {
    $pkgTime  = (Get-Item "package.json").LastWriteTime
    $lockTime = if (Test-Path "node_modules\.package-lock.json") {
        (Get-Item "node_modules\.package-lock.json").LastWriteTime
    } else { [DateTime]::MinValue }
    if ($pkgTime -gt $lockTime) {
        Warn "检测到 package.json 变更，重新安装依赖..."
        $needInstall = $true
    }
}

if ($needInstall) {
    Log "安装生产依赖（首次约 1-2 分钟，会按本机平台重建原生模块）..."
    if (Test-Path "package-lock.json") {
        npm ci --omit=dev --legacy-peer-deps
        if ($LASTEXITCODE -ne 0) {
            Warn "npm ci 失败，回退 npm install ..."
            npm install --omit=dev --legacy-peer-deps
            if ($LASTEXITCODE -ne 0) { Fail "npm install 失败。" }
        }
    } else {
        npm install --omit=dev --legacy-peer-deps
        if ($LASTEXITCODE -ne 0) { Fail "npm install 失败。" }
    }
}
Log "依赖已就绪 ✓"

# ---------- Prisma Client ----------
Log "生成 Prisma Client ..."
npx prisma generate --schema=prisma/schema.prisma 2>$null | Out-Null

# ---------- 数据库 ----------
$needMigrate = $false
$needSeed    = $false

if (-not (Test-Path "dev.db")) {
    $needMigrate = $true
    $needSeed    = $true
} else {
    $count = node -e @"
try {
  const {PrismaBetterSqlite3} = require('@prisma/adapter-better-sqlite3');
  const {PrismaClient} = require('@prisma/client');
  const adapter = new PrismaBetterSqlite3({url: 'file:./dev.db'});
  const prisma = new PrismaClient({adapter});
  prisma.session.count().then(n => { process.stdout.write(String(n)); prisma.`$disconnect(); }).catch(()=>{ process.stdout.write('-1'); });
} catch(e) { process.stdout.write('-1'); }
"@ 2>$null
    if ([string]::IsNullOrEmpty($count) -or $count -eq "-1") {
        $needMigrate = $true; $needSeed = $true
    } elseif ($count -eq "0") {
        $needSeed = $true
    }
}

if ($needMigrate) {
    Log "应用数据库迁移 ..."
    npx prisma migrate deploy --schema=prisma/schema.prisma 2>$null
    if ($LASTEXITCODE -ne 0) { Warn "migrate deploy 未成功，可能首次创建" }
}

if ($needSeed) {
    Log "写入初始数据（场次/角色/二维码）..."
    npx tsx prisma/seed.ts
    if ($LASTEXITCODE -ne 0) { Fail "seed 失败。" }
    Log "初始数据已写入 ✓"
} else {
    Log "数据库已存在数据，跳过 seed ✓"
}

# ---------- uploads ----------
if (-not (Test-Path "uploads")) { New-Item -ItemType Directory -Path "uploads" | Out-Null }
Log "uploads\ 目录已就绪 ✓"

# ---------- 端口检测 ----------
$occupied = netstat -ano 2>$null | Select-String ":$port\s" | Select-String "LISTENING"
if ($occupied) {
    Warn "端口 $port 已被占用，尝试 $($port + 1)..."
    $port = $port + 1
}

# ---------- 本机 IP ----------
$localIP = (
    Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -notmatch '^169' } |
    Select-Object -First 1
).IPAddress
if (-not $localIP) { $localIP = "localhost" }

# ---------- 启动 ----------
Write-Host ""
Log "启动生产服务..."
Write-Host ""
Write-Host "    本机:    http://localhost:$port"
Write-Host "    局域网:  http://${localIP}:$port"
Write-Host ""
Write-Host "  角色入口："
Write-Host "    导演登录:     http://localhost:$port/director/login"
Write-Host "    甄选团队:     http://localhost:$port/casting/login"
Write-Host "    Casting Book: http://localhost:$port/casting/book"
Write-Host "    二维码管理:   http://localhost:$port/admin/qrcodes"
Write-Host ""
Write-Host "  按 Ctrl+C 停止服务"
Write-Host ""

npx next start -p $port

# Live Audition Scoring — Windows 启动脚本
# 使用方式: 右键 -> "用 PowerShell 运行"，或在 PowerShell 终端执行 .\start.ps1

$ErrorActionPreference = "Stop"

function Log  { Write-Host "[LAS] $args" -ForegroundColor Green }
function Warn { Write-Host "[LAS] $args" -ForegroundColor Yellow }
function Fail { Write-Host "[LAS] ERROR: $args" -ForegroundColor Red; Read-Host "按 Enter 退出"; exit 1 }

Write-Host ""
Write-Host "  Live Audition Scoring"
Write-Host "  ====================="
Write-Host ""

# ---------- Node.js ----------
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Fail "Node.js 未安装。请访问 https://nodejs.org 安装 Node.js 18 或更高版本。"
}

$nodeVersion = node -e "process.stdout.write(String(process.versions.node.split('.')[0]))"
if ([int]$nodeVersion -lt 18) {
    Fail "Node.js 版本过低（当前 $(node -v)），需要 v18 或更高版本。"
}
Log "Node.js $(node -v) ✓"

# ---------- npm ----------
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Fail "npm 未找到，请重新安装 Node.js。"
}
Log "npm $(npm -v) ✓"

# ---------- 依赖安装 ----------
if (-not (Test-Path "node_modules")) {
    Log "首次运行，正在安装依赖（约需 1-2 分钟）..."
    npm install --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) { Fail "npm install 失败，请检查网络或 Node.js 版本。" }
} else {
    $pkgTime  = (Get-Item "package.json").LastWriteTime
    $lockTime = if (Test-Path "node_modules/.package-lock.json") {
        (Get-Item "node_modules/.package-lock.json").LastWriteTime
    } else { [DateTime]::MinValue }

    if ($pkgTime -gt $lockTime) {
        Warn "检测到依赖变更，正在更新..."
        npm install --legacy-peer-deps
        if ($LASTEXITCODE -ne 0) { Fail "npm install 失败。" }
    }
}
Log "依赖已就绪 ✓"

# ---------- 环境变量 ----------
if (-not (Test-Path ".env")) {
    Log "生成 .env 文件..."
    Set-Content ".env" 'DATABASE_URL="file:./dev.db"'
}

# ---------- 数据库迁移 ----------
Log "检查数据库..."
npx prisma migrate deploy --schema=prisma/schema.prisma 2>$null
if ($LASTEXITCODE -ne 0) {
    Warn "migrate deploy 失败，尝试 migrate dev（开发模式）..."
    npx prisma migrate dev --name init --schema=prisma/schema.prisma 2>$null
}
Log "数据库结构已同步 ✓"

# ---------- 生成 Prisma Client ----------
npx prisma generate --schema=prisma/schema.prisma 2>$null
Log "Prisma Client 已生成 ✓"

# ---------- 数据库初始数据 ----------
$needSeed = $false
if (-not (Test-Path "dev.db")) {
    $needSeed = $true
} else {
    $count = node -e @"
const {PrismaBetterSqlite3} = require('@prisma/adapter-better-sqlite3');
const {PrismaClient} = require('@prisma/client');
const adapter = new PrismaBetterSqlite3({url: 'file:./dev.db'});
const prisma = new PrismaClient({adapter});
prisma.session.count().then(n => { process.stdout.write(String(n)); prisma.`$disconnect(); }).catch(()=>process.stdout.write('0'));
"@ 2>$null
    if ([string]::IsNullOrEmpty($count) -or $count -eq "0") { $needSeed = $true }
}

if ($needSeed) {
    Log "写入初始数据（场次、角色、二维码）..."
    npx tsx prisma/seed.ts
    if ($LASTEXITCODE -ne 0) { Fail "seed 失败，请检查数据库配置。" }
    Log "初始数据已写入 ✓"
} else {
    Log "数据库已有数据，跳过 seed ✓"
}

# ---------- 上传目录 ----------
if (-not (Test-Path "uploads")) { New-Item -ItemType Directory -Path "uploads" | Out-Null }
Log "uploads/ 目录已就绪 ✓"

# ---------- 端口检测 ----------
$port = 3000
$occupied = netstat -ano 2>$null | Select-String ":$port\s" | Select-String "LISTENING"
if ($occupied) {
    Warn "端口 $port 已被占用，尝试 $($port + 1)..."
    $port = $port + 1
}

# ---------- 获取本机 IP ----------
$localIP = (
    Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -notmatch '^169' } |
    Select-Object -First 1
).IPAddress
if (-not $localIP) { $localIP = "localhost" }

# ---------- 启动 ----------
Write-Host ""
Log "启动服务，访问地址："
Write-Host ""
Write-Host "    本机:    http://localhost:$port"
Write-Host "    局域网:  http://${localIP}:$port"
Write-Host ""
Write-Host "  角色入口："
Write-Host "    导演打分:    http://localhost:$port/director/login"
Write-Host "    甄选团队:    http://localhost:$port/casting/login"
Write-Host "    二维码管理:  http://localhost:$port/admin/qrcodes"
Write-Host ""
Write-Host "  按 Ctrl+C 停止服务"
Write-Host ""

npx next dev -p $port

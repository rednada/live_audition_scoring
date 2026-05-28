# 打包脚本 (Windows PowerShell) — 生产模式发包
#
# 默认行为：
#   • 在打包机上执行 next build（产出 .next\）一并打入包内，目标机无需再 build
#   • 自动携带当前 dev.db 与 uploads\（演示/迁移数据随包带走）
#   • 不打入 node_modules：目标机首次启动会自动按本机平台安装生产依赖
#
# 用法:
#   .\pack.ps1                # 默认：含 dev.db + uploads + .next\
#   .\pack.ps1 -NoData        # 干净包：不带 dev.db / uploads
#   .\pack.ps1 -SkipBuild     # 跳过 next build

param(
    [switch]$NoData,
    [switch]$SkipBuild,
    [switch]$WithData  # 兼容旧参数（默认即带）
)

$ErrorActionPreference = "Stop"
function Log  { Write-Host "[PACK] $args" -ForegroundColor Green }
function Warn { Write-Host "[PACK] $args" -ForegroundColor Yellow }
function Fail { Write-Host "[PACK] ERROR: $args" -ForegroundColor Red; exit 1 }

$withData = -not $NoData
$date     = Get-Date -Format "yyyyMMdd"
$outName  = "live-audition-scoring-$date"
$outZip   = "$PSScriptRoot\$outName.zip"
$tmpDir   = Join-Path $env:TEMP "las_pack_$([System.IO.Path]::GetRandomFileName())"
$pkgDir   = Join-Path $tmpDir $outName

Log "开始打包 Live Audition Scoring..."
if ($withData) { Log "数据模式: 带当前 dev.db + uploads\" } else { Warn "数据模式: 干净包（不带 dev.db / uploads）" }
if ($SkipBuild) { Warn "构建模式: 跳过 next build" } else { Log "构建模式: 执行 next build" }

# ---------- 校验工具 ----------
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail "未找到 node，请先安装 Node.js 18+" }
if (-not (Get-Command npm  -ErrorAction SilentlyContinue)) { Fail "未找到 npm" }

# ---------- 安装依赖（构建用） ----------
Set-Location $PSScriptRoot
if (-not (Test-Path "node_modules")) {
    Log "首次打包，安装依赖（约 1-2 分钟）..."
    npm install --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) { Fail "npm install 失败" }
}

# ---------- 生产构建 ----------
if (-not $SkipBuild) {
    Log "执行 next build（生成 .next\）..."
    npm run build
    if ($LASTEXITCODE -ne 0) { Fail "next build 失败" }
}
if (-not (Test-Path ".next")) { Fail ".next 目录不存在，请先执行 npm run build" }

# ---------- 准备打包目录 ----------
New-Item -ItemType Directory -Path $pkgDir -Force | Out-Null

# 排除项（精确名称或通配符）— 注意我们要保留 .next/
$excludeNames = @(
    "node_modules", ".git", "uploads",
    "dev.db", "dev.db-shm", "dev.db-wal",
    "AGENTS.md", "PLAN.md"
)
$excludeGlobs = @("*.log", "*.tsbuildinfo", "live-audition-scoring-*.zip")

Log "复制源码与构建产物..."
Get-ChildItem -Path $PSScriptRoot -Force | Where-Object {
    $item = $_
    $skip = $false
    foreach ($ex in $excludeNames) { if ($item.Name -eq $ex) { $skip = $true; break } }
    foreach ($gl in $excludeGlobs)  { if ($item.Name -like $gl) { $skip = $true; break } }
    -not $skip
} | ForEach-Object {
    $dest = Join-Path $pkgDir $_.Name
    if ($_.PSIsContainer) {
        Copy-Item -Path $_.FullName -Destination $dest -Recurse -Force
    } else {
        Copy-Item -Path $_.FullName -Destination $dest -Force
    }
}

# .next/cache 不必随包带走（缓存）
$cacheDir = Join-Path $pkgDir ".next\cache"
if (Test-Path $cacheDir) { Remove-Item $cacheDir -Recurse -Force }

# 数据：默认带，可关
if ($withData) {
    $dbSrc = Join-Path $PSScriptRoot "dev.db"
    if (Test-Path $dbSrc) {
        Log "复制 dev.db ..."
        Copy-Item $dbSrc (Join-Path $pkgDir "dev.db") -Force
    } else { Warn "未找到 dev.db，跳过（目标机首次启动会自动 migrate + seed）" }

    $upSrc = Join-Path $PSScriptRoot "uploads"
    if (Test-Path $upSrc) {
        Log "复制 uploads\ ..."
        Copy-Item $upSrc (Join-Path $pkgDir "uploads") -Recurse -Force
    }
}

# 始终预留 uploads 目录
New-Item -ItemType Directory -Path (Join-Path $pkgDir "uploads") -Force | Out-Null

# 写最小化 .env
@'
DATABASE_URL="file:./dev.db"
# 生产模式启动端口，可在目标机修改
PORT=3000
'@ | Set-Content (Join-Path $pkgDir ".env") -Encoding UTF8

# DEPLOY.md
@'
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
'@ | Set-Content (Join-Path $pkgDir "DEPLOY.md") -Encoding UTF8

Log "生成 zip 包..."
if (Test-Path $outZip) { Remove-Item $outZip -Force }
Compress-Archive -Path "$tmpDir\*" -DestinationPath $outZip -Force
Remove-Item $tmpDir -Recurse -Force

$sizeMB = [math]::Round((Get-Item $outZip).Length / 1MB, 1)
Log "打包完成: $outName.zip (${sizeMB} MB)"
Write-Host ""
Write-Host "  目标机使用方式："
Write-Host "    Windows:        解压后双击 start.bat"
Write-Host "    macOS / Linux:  unzip ${outName}.zip && cd $outName && ./start.sh"
Write-Host ""

# 打包脚本 (Windows PowerShell)
# 用法:
#   .\pack.ps1              # 干净包，不含数据库和上传文件
#   .\pack.ps1 -WithData    # 包含现有数据库和上传文件

param([switch]$WithData)

$ErrorActionPreference = "Stop"
function Log  { Write-Host "[PACK] $args" -ForegroundColor Green }
function Warn { Write-Host "[PACK] $args" -ForegroundColor Yellow }

$date    = Get-Date -Format "yyyyMMdd"
$outName = "live-audition-scoring-$date"
$outZip  = "$PSScriptRoot\$outName.zip"
$tmpDir  = Join-Path $env:TEMP "las_pack_$([System.IO.Path]::GetRandomFileName())"
$pkgDir  = Join-Path $tmpDir $outName

Log "开始打包 Live Audition Scoring..."
if ($WithData) { Warn "包含模式: 带数据 (-WithData)" } else { Log "包含模式: 干净包" }

# 排除项（精确名称或通配符）
$excludeNames = @(
    "node_modules", ".next", ".git", "uploads",
    "dev.db", "dev.db-shm", "dev.db-wal",
    "next-env.d.ts", "AGENTS.md"
)
$excludeGlobs = @("*.log", "*.tsbuildinfo", "live-audition-scoring-*.zip")

New-Item -ItemType Directory -Path $pkgDir -Force | Out-Null

Log "复制源代码..."
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

# 按需带数据
if ($WithData) {
    $dbSrc = Join-Path $PSScriptRoot "dev.db"
    if (Test-Path $dbSrc) {
        Log "复制数据库..."
        Copy-Item $dbSrc (Join-Path $pkgDir "dev.db") -Force
    } else { Warn "未找到 dev.db，跳过" }

    $upSrc = Join-Path $PSScriptRoot "uploads"
    if (Test-Path $upSrc) {
        Log "复制上传文件..."
        Copy-Item $upSrc (Join-Path $pkgDir "uploads") -Recurse -Force
    } else { Warn "未找到 uploads\，跳过" }
}

# 始终创建空 uploads 目录
New-Item -ItemType Directory -Path (Join-Path $pkgDir "uploads") -Force | Out-Null

# 写干净的 .env
Set-Content (Join-Path $pkgDir ".env") 'DATABASE_URL="file:./dev.db"'

Log "生成 zip 包..."
if (Test-Path $outZip) { Remove-Item $outZip -Force }
Compress-Archive -Path "$tmpDir\*" -DestinationPath $outZip -Force
Remove-Item $tmpDir -Recurse -Force

$sizeMB = [math]::Round((Get-Item $outZip).Length / 1MB, 1)
Log "打包完成: $outName.zip (${sizeMB} MB)"
Write-Host ""
Write-Host "  收件方使用方式:"
Write-Host "    Windows:        解压后双击 start.bat"
Write-Host "    macOS / Linux:  unzip ${outName}.zip && cd $outName && ./start.sh"
Write-Host ""

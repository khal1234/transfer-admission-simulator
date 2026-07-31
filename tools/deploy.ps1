<#
.SYNOPSIS
  로컬에서 빌드해서 Netlify에 올린다 (transfer-admission-simulator).

.DESCRIPTION
  자동 빌드를 꺼둔 상태(tools/set_builds.ps1 -Stop)에서 게시하는 유일한 경로다.
  빌드를 Netlify가 아니라 로컬에서 끝내고 결과물만 올린다(--no-build).

  기본은 프리뷰다. 프리뷰는 임시 URL이 나오고 크레딧을 쓰지 않는다.
  -Production 을 줄 때만 실제 사이트에 게시되며 15크레딧이 나간다.

  올리기 전에 테스트와 빌드를 먼저 돌리고, 하나라도 실패하면 배포하지 않는다.

.EXAMPLE
  powershell -File tools/deploy.ps1              # 프리뷰 (무료)
  powershell -File tools/deploy.ps1 -Production  # 실제 게시 (15크레딧)
#>
[CmdletBinding()]
param(
    [switch]$Production,
    [string]$Message = "local prebuilt deploy",
    # 테스트를 건너뛴다. 급할 때만 쓰고, 평소에는 쓰지 말 것.
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "netlify-site.ps1")

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$WebDir = Join-Path $ProjectRoot "web"
$DistDir = Join-Path $WebDir "dist"

if (-not (Get-Command netlify -ErrorAction SilentlyContinue)) {
    throw "netlify CLI가 없다. 'npm install -g netlify-cli' 후 'netlify login'."
}
if (-not (Test-Path (Join-Path $WebDir "node_modules"))) {
    throw "web/node_modules 가 없다. 먼저 'cd web; npm ci'."
}

Set-Location $WebDir

if (-not $SkipTests) {
    Write-Host "[deploy] 테스트 실행..." -ForegroundColor Cyan
    & npm test
    if ($LASTEXITCODE -ne 0) { throw "테스트 실패 — 배포를 중단한다." }
} else {
    Write-Host "[deploy] 테스트 건너뜀 (-SkipTests)" -ForegroundColor Yellow
}

Write-Host "[deploy] 빌드 실행..." -ForegroundColor Cyan
& npm run build
if ($LASTEXITCODE -ne 0) { throw "빌드 실패 — 배포를 중단한다." }

if (-not (Test-Path (Join-Path $DistDir "index.html"))) {
    throw "빌드 산출물이 없다: $DistDir\index.html"
}

Set-Location $ProjectRoot

# --no-build: Netlify 쪽에서 다시 빌드하지 않는다. 자동 빌드가 꺼져 있어도 이 경로는 동작한다.
# --site: 현재 디렉터리의 우연한 link 상태가 아니라 SSOT의 사이트로 고정한다.
$DeployArgs = @(
    "deploy",
    "--site=$($NetlifySite.Id)",
    "--dir=web/dist",
    "--no-build",
    "--message=$Message"
)

if ($Production) {
    # 실제 게시 직전에 API가 돌려준 ID·이름·URL 셋을 모두 확인한다.
    Get-VerifiedNetlifySite "netlify" | Out-Null
    Write-Host ""
    Write-Host "[deploy] 프로덕션 게시입니다 — 15크레딧이 소모됩니다." -ForegroundColor Red
    $answer = Read-Host "계속하려면 'yes' 를 입력하세요"
    if ($answer -ne "yes") {
        Write-Host "[deploy] 취소했습니다." -ForegroundColor Yellow
        exit 0
    }
    $DeployArgs += "--prod"
} else {
    Write-Host "[deploy] 프리뷰로 올립니다 (무료). 실제 게시는 -Production." -ForegroundColor Cyan
}

& netlify @DeployArgs
if ($LASTEXITCODE -ne 0) { throw "netlify 배포 실패." }

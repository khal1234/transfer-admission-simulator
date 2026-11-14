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
    [switch]$SkipTests,
    # 커밋 안 된 변경이 있어도 실제 게시를 한다. 쓰면 운영 판의 원본이 저장소에
    # 남지 않으므로, 게시 직후 반드시 커밋할 것.
    [switch]$AllowDirty
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

# 업데이트 알림이 뒤처졌는지 먼저 본다. 사이트가 실제로 바뀌는 자리가 여기라,
# 여기서 안 막으면 사용자는 바뀐 줄 모르는 채로 바뀐 사이트를 보게 된다.
# (2026-08-12 데이터 수정 3건이 알림 없이 나갈 뻔했다.)
Write-Host "[deploy] 업데이트 알림 확인..." -ForegroundColor Cyan
& python (Join-Path $PSScriptRoot "check_update_notice.py")
if ($LASTEXITCODE -ne 0) { throw "업데이트 알림이 뒤처졌다 — 배포를 중단한다." }

# 커밋 안 된 변경이 사이트에 들어가는지 본다.
# 무엇을 재나: 사이트에 실리는 폴더(web · results)에 커밋 안 된 변경이 있는지.
# 문턱과 근거: 한 줄이라도 있으면 실제 게시를 멈춘다. 2026-10-05 무렵 작업 폴더가
#   커밋 없이 그대로 게시돼, 운영 판을 다시 만들 원본이 이 PC 한 곳에만 있었다
#   (2026-11-14 검토 1번). 프리뷰는 고치는 중에 보는 것이라 알리기만 한다.
# 못 보는 것: 커밋은 했지만 원격에 안 올린 것.
$Dirty = @(& git -C $ProjectRoot status --porcelain -- web results)
if ($Dirty.Count -gt 0) {
    Write-Host "[deploy] 커밋 안 된 변경 $($Dirty.Count)개가 이번 빌드에 들어갑니다:" -ForegroundColor Yellow
    $Dirty | Select-Object -First 10 | ForEach-Object { Write-Host "         $_" -ForegroundColor Yellow }
    if ($Production -and -not $AllowDirty) {
        throw "커밋 안 된 변경이 있어 실제 게시를 중단한다. 먼저 커밋하거나, 알고 진행하려면 -AllowDirty."
    }
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
    # 월 배포 한도 확인 — 2026-09-01 신설(tools/deploy_quota.py). 여럿이 나눠 쓰는
    # 공용 한도라, 남은 횟수를 안 보여주면 누군가 모르고 다 써서 사이트가 멈춘다.
    & python (Join-Path $PSScriptRoot "deploy_quota.py") --check
    if ($LASTEXITCODE -ne 0) {
        throw "이번 달 배포 한도를 다 썼다. 정말 진행하려면 'python tools/deploy_quota.py --check --force' 로 직접 확인 후 이 스크립트를 수정 없이 계속 쓰지 말고 사유를 남길 것."
    }
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

if ($Production) {
    & python (Join-Path $PSScriptRoot "deploy_quota.py") --record
    Write-Host "[deploy] 기록: 기록/배포-횟수.txt — 커밋·푸시해 다른 컨트리뷰터도 남은 횟수를 보게 할 것." -ForegroundColor Cyan
}

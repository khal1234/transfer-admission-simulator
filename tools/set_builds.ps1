<#
.SYNOPSIS
  Netlify 사이트의 Git 자동 빌드를 켜거나 끈다 (transfer-admission-simulator).

.DESCRIPTION
  프로덕션 배포 1회 = 15크레딧. 무료 플랜은 월 300크레딧(=20회)이라
  GitHub push마다 자동 배포되면 남의 커밋으로 한도가 소진된다.
  이 스크립트는 그 자동 빌드 스위치(build_settings.stop_builds)만 토글한다.

  -Stop   자동 빌드 중단 (push해도 배포 안 됨. 게시는 수동 deploy만)
  -Start  자동 빌드 재개 (push하면 즉시 배포 = 크레딧 소모)

  로컬 netlify CLI 로그인 자격을 그대로 쓴다.
  실행 결과는 tools/set_builds.log 에 한 줄씩 누적된다.

.EXAMPLE
  powershell -File tools/set_builds.ps1 -Stop
#>
[CmdletBinding(DefaultParameterSetName = "Stop")]
param(
    [Parameter(ParameterSetName = "Stop")]
    [switch]$Stop,

    [Parameter(ParameterSetName = "Start")]
    [switch]$Start
)

$ErrorActionPreference = "Stop"

$SiteId = "b798737f-59ef-4a3a-801d-727b80edf1c4"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LogPath = Join-Path $PSScriptRoot "set_builds.log"

# -Stop 이 기본값이다. 잠그는 쪽이 안전한 방향이라 기본을 그쪽에 둔다.
$StopBuilds = -not $Start

function Write-Log([string]$Message) {
    $line = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Add-Content -Path $LogPath -Value $line -Encoding utf8
    Write-Host $line
}

# Task Scheduler 로 돌 때는 PATH 에 npm 전역 경로가 없을 수 있다.
$netlify = (Get-Command netlify -ErrorAction SilentlyContinue).Source
if (-not $netlify) {
    $fallback = Join-Path $env:APPDATA "npm\netlify.cmd"
    if (Test-Path $fallback) {
        $netlify = $fallback
    } else {
        Write-Log "FAIL  netlify CLI를 찾을 수 없다 (PATH·$fallback 둘 다 없음)"
        exit 1
    }
}

# PS 5.1은 네이티브 exe로 인자를 넘길 때 큰따옴표를 벗겨버린다.
# 그대로 주면 netlify CLI가 `{site_id:...}` 를 받아 JSON 파싱에 실패한다.
function ConvertTo-NativeJsonArg([hashtable]$Object) {
    ($Object | ConvertTo-Json -Depth 5 -Compress) -replace '"', '\"'
}

$body = ConvertTo-NativeJsonArg @{
    site_id = $SiteId
    body    = @{ build_settings = @{ stop_builds = $StopBuilds } }
}

& $netlify api updateSite --data $body | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Log "FAIL  updateSite 실패 (exit $LASTEXITCODE) — stop_builds=$StopBuilds 적용 안 됨"
    exit 1
}

# 응답을 믿지 않고 다시 읽어서 확인한다.
$verifyJson = & $netlify api getSite --data (ConvertTo-NativeJsonArg @{ site_id = $SiteId })
if ($LASTEXITCODE -ne 0) {
    Write-Log "WARN  적용은 했으나 재확인(getSite) 실패 — 대시보드에서 직접 볼 것"
    exit 1
}

$actual = ($verifyJson | ConvertFrom-Json).build_settings.stop_builds
if ($actual -ne $StopBuilds) {
    Write-Log "FAIL  요청 stop_builds=$StopBuilds 인데 실제는 $actual"
    exit 1
}

if ($actual) {
    Write-Log "OK    자동 빌드 중단됨 (stop_builds=true). push해도 배포 안 된다."
} else {
    Write-Log "OK    자동 빌드 재개됨 (stop_builds=false). push하면 배포 = 15크레딧/회."
}

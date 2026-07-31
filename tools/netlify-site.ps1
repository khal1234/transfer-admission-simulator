# Netlify 배포 대상 SSOT. 두 관리 스크립트는 이 파일만 참조한다.
$NetlifySite = [PSCustomObject]@{
    Id   = "b798737f-59ef-4a3a-801d-727b80edf1c4"
    Name = "transfer-admission-simulator"
    Url  = "https://transfer-admission-simulator.netlify.app"
}

function ConvertTo-NativeJsonArg([hashtable]$Object) {
    # PS 5.1은 네이티브 exe 인자에서 큰따옴표를 벗기므로 한 번 더 이스케이프한다.
    ($Object | ConvertTo-Json -Depth 5 -Compress) -replace '"', '\"'
}

function Get-VerifiedNetlifySite([string]$NetlifyCommand) {
    $siteJson = & $NetlifyCommand api getSite --data (
        ConvertTo-NativeJsonArg @{ site_id = $NetlifySite.Id }
    )
    if ($LASTEXITCODE -ne 0) {
        throw "Netlify 대상 사이트 조회 실패 (exit $LASTEXITCODE)"
    }

    $actual = $siteJson | ConvertFrom-Json
    $actualUrl = if ($actual.ssl_url) { $actual.ssl_url } else { $actual.url }
    Write-Host (
        "[netlify] 대상 ID={0} / 이름={1} / URL={2}" -f $actual.id, $actual.name, $actualUrl
    ) -ForegroundColor Cyan

    $expectedUrl = $NetlifySite.Url.TrimEnd('/')
    if (
        $actual.id -ne $NetlifySite.Id -or
        $actual.name -ne $NetlifySite.Name -or
        $actualUrl.TrimEnd('/') -ne $expectedUrl
    ) {
        throw (
            "Netlify 대상 불일치. 예상 ID={0}, 이름={1}, URL={2}" -f
            $NetlifySite.Id, $NetlifySite.Name, $NetlifySite.Url
        )
    }

    return $actual
}

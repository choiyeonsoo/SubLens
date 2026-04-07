<#
.SYNOPSIS
  Staged 변경(git diff --cached)을 분석해 규칙화된 커밋 메시지를 생성합니다.

.DESCRIPTION
  - 변경된 파일 목록: name-status 기준 (추가/수정/삭제 등)
  - 그룹별: 최상위 디렉터리(frontend, backend, ai, …)로 묶고, 그룹별 diff --stat 요약을 "내용"에 넣습니다.

.EXAMPLE
  git add -A
  .\scripts\git-compose-commit.ps1 -Commit

.EXAMPLE
  .\scripts\git-compose-commit.ps1 -Commit -Push
#>
[CmdletBinding()]
param(
  [switch] $Commit,
  [switch] $Push,
  [switch] $Edit,
  [string] $OutFile = ""
)

$ErrorActionPreference = "Stop"
try {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

function Get-ChangeTypeLabel([string] $status) {
  $code = if ($status.Length -ge 1) { $status.Substring(0, 1) } else { $status }
  switch ($code) {
    "A" { return "추가" }
    "M" { return "수정" }
    "D" { return "삭제" }
    "R" { return "이름 변경" }
    "C" { return "복사" }
    "T" { return "타입 변경" }
    "U" { return "병합(미해결)" }
    default { return $status }
  }
}

function Get-GroupName([string] $relativePath) {
  $p = $relativePath -replace "\\", "/"
  $seg = ($p -split "/")[0]
  if ([string]::IsNullOrWhiteSpace($seg)) { return "루트" }
  switch -Regex ($seg) {
    "^frontend$" { return "프론트엔드 (frontend)" }
    "^backend$" { return "백엔드 (backend)" }
    "^ai$" { return "AI (ai)" }
    "^nginx$" { return "nginx" }
    "^docker$" { return "Docker" }
    "^\.cursor$" { return ".cursor" }
    default { return $seg }
  }
}

$top = git rev-parse --show-toplevel 2>$null
if (-not $top) {
  Write-Error "Git 저장소 루트가 아닙니다."
}

Push-Location $top
try {
$raw = git diff --cached --name-status 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Error "git diff --cached 실패"
}

$lines = @($raw | Where-Object { $_ -and $_.Trim() -ne "" })
if ($lines.Count -eq 0) {
  Write-Host "스테이징된 변경이 없습니다. 먼저 git add 하세요." -ForegroundColor Yellow
  exit 1  # finally 에서 Pop-Location 실행됨
}

$entries = New-Object System.Collections.Generic.List[object]

foreach ($line in $lines) {
  $parts = $line -split "`t"
  if ($parts.Count -eq 2) {
    $entries.Add([pscustomobject]@{
        Status = $parts[0].Trim()
        Path   = $parts[1].Trim()
        Label  = (Get-ChangeTypeLabel $parts[0].Trim())
      })
  }
  elseif ($parts.Count -ge 3 -and $parts[0] -match "^R") {
    $oldP = $parts[1].Trim()
    $newP = $parts[-1].Trim()
    $entries.Add([pscustomobject]@{
        Status = $parts[0].Trim()
        Path   = $newP
        Label  = (Get-ChangeTypeLabel $parts[0].Trim())
        Extra  = "← $oldP"
      })
  }
  else {
    $entries.Add([pscustomobject]@{
        Status = "?"
        Path   = $line
        Label  = "?"
      })
  }
}

# 그룹: Path 기준
$groups = $entries | Group-Object { Get-GroupName $_.Path } | Sort-Object Name

$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine("## 변경사항 요약")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("### 변경된 파일 목록")
foreach ($e in ($entries | Sort-Object Path)) {
  $suffix = if ($e.Extra) { " ($($e.Extra))" } else { "" }
  [void]$sb.AppendLine("- $($e.Path) ($($e.Label))$suffix")
}
[void]$sb.AppendLine("")
[void]$sb.AppendLine("### 그룹별 변경 내용")

$idx = 1
foreach ($g in $groups) {
  $paths = $g.Group | ForEach-Object { $_.Path }
  $groupStat = ""
  if ($paths.Count -gt 0) {
    $groupStat = @(git diff --cached --stat -- $paths) -join "`n"
  }
  $summary = ($groupStat.Trim() -split "`n") | Where-Object { $_ -match "files? changed" } | Select-Object -Last 1
  if (-not $summary) { $summary = ($groupStat.Trim() -split "`n" | Select-Object -Last 5) -join " " }

  [void]$sb.AppendLine("$idx. [$($g.Name)]")
  [void]$sb.AppendLine("   - 파일: $($paths -join ', ')")
  [void]$sb.AppendLine("   - 내용: $(if ($summary) { $summary } else { '(요약 없음 — 필요 시 수동으로 보완)' })")
  [void]$sb.AppendLine("")
  $idx++
}

$message = $sb.ToString()

if (-not $OutFile) {
  $OutFile = Join-Path $env:TEMP ("sublens-commit-msg-{0:yyyyMMdd-HHmmss}.txt" -f (Get-Date))
}
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($OutFile, $message, $utf8NoBom)

Write-Host "커밋 메시지 저장: $OutFile" -ForegroundColor Cyan
Write-Host ""
Write-Host $message

if ($Edit) {
  notepad $OutFile
  Read-Host "편집을 마쳤으면 Enter"
}

if ($Commit) {
  git commit -F $OutFile
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

if ($Push) {
  if (-not $Commit) {
    Write-Warning "-Push 는 보통 -Commit 과 함께 씁니다. 이미 커밋했다면 원격만 푸시합니다."
  }
  $branch = git rev-parse --abbrev-ref HEAD
  git push -u origin $branch
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

}
finally {
  Pop-Location
}

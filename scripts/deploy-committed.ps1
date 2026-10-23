﻿# コミット済みの内容だけをビルドして本番にデプロイする。
# 作業中（未コミット）のランキングファイルが混ざらないよう、HEAD を別フォルダに取り出して組み立てる。
# 使い方: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-committed.ps1
# 注意: このファイルは BOM 付き UTF-8 で保存する（Windows PowerShell 5.1 が日本語を読めるように）。
# 注意: $ErrorActionPreference を Stop にしない。5.1 では外部コマンドの標準エラー出力だけで停止扱いになり、
#       後片付け（リンクの解除）に届かないことがある。成否は $LASTEXITCODE で見る。
$repo = Split-Path -Parent $PSScriptRoot
$work = Join-Path (Split-Path -Parent $repo) 'afi-deploy'
$link = Join-Path $work 'node_modules'

function Remove-DeployFolder {
    # 先にリンクだけを外す。リンクが付いたまま再帰削除や git worktree remove をすると、
    # リンク先（本体の node_modules）の中身まで消える。
    $j = Get-Item $link -Force -ErrorAction SilentlyContinue
    if ($j -and $j.LinkType -eq 'Junction') { $j.Delete() }
    if (-not (Test-Path $work)) { return }
    $left = Get-ChildItem $work -Force -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.LinkType }
    if ($left) { Write-Host "$work にリンクが残っているので削除を中止しました。手で確認してください。"; return }
    Remove-Item $work -Recurse -Force
    git -C $repo worktree prune
}

if (Test-Path $work) { Write-Host "$work が既にあります。前回の後片付けを確認してください。"; exit 1 }
$ok = $false
try {
    git -C $repo worktree add --detach $work HEAD
    if ($LASTEXITCODE -ne 0) { Write-Host 'worktree add failed'; exit 1 }
    New-Item -ItemType Junction -Path $link -Target (Join-Path $repo 'node_modules') | Out-Null
    Push-Location $work
    npm.cmd run build
    if ($LASTEXITCODE -eq 0) {
        npx.cmd wrangler deploy
        if ($LASTEXITCODE -eq 0) { $ok = $true } else { Write-Host 'deploy failed' }
    } else { Write-Host 'build failed' }
    Pop-Location
} finally {
    Remove-DeployFolder
}
if (-not $ok) { exit 1 }
Write-Host 'deployed'

﻿# コミット済みの内容だけをビルドして本番にデプロイする。
# 作業中（未コミット）のランキングファイルが混ざらないよう、HEAD を別フォルダに取り出して組み立てる。
# 使い方: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-committed.ps1
# 注意: このファイルは BOM 付き UTF-8 で保存する（Windows PowerShell 5.1 が日本語を読めるように）。
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$work = Join-Path (Split-Path -Parent $repo) 'afi-deploy'
$link = Join-Path $work 'node_modules'

if (Test-Path $work) { throw "$work が既にあります。前回の後片付けを確認してください。" }
git -C $repo worktree add --detach $work HEAD | Out-Null
try {
    # node_modules は本体のものをリンクで共有する
    New-Item -ItemType Junction -Path $link -Target (Join-Path $repo 'node_modules') | Out-Null
    Push-Location $work
    try {
        npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw 'build failed' }
        npx.cmd wrangler deploy
        if ($LASTEXITCODE -ne 0) { throw 'deploy failed' }
    } finally { Pop-Location }
} finally {
    # 先にリンクだけを外す。git worktree remove や再帰削除をリンクが付いたまま実行すると、
    # リンク先（本体の node_modules）の中身まで消える。
    $j = Get-Item $link -Force -ErrorAction SilentlyContinue
    if ($j -and $j.LinkType -eq 'Junction') { $j.Delete() }
    $left = Get-ChildItem $work -Force -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.LinkType }
    if ($left) { throw "$work にリンクが残っているので削除を中止しました。手で確認してください。" }
    Remove-Item $work -Recurse -Force
    git -C $repo worktree prune
}

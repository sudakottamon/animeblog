# コミット済みの内容だけをビルドして本番にデプロイする。
# 作業中（未コミット）のランキングファイルが混ざらないよう、HEAD を別フォルダに取り出して組み立てる。
# 使い方: powershell -File scripts/deploy-committed.ps1
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$work = Join-Path (Split-Path -Parent $repo) 'afi-deploy'

if (Test-Path $work) { throw "$work が既にあります。前回の後片付けを確認してください。" }
git -C $repo worktree add --detach $work HEAD | Out-Null
try {
    # node_modules は本体のものをリンクで共有する（消すときはリンクだけ外す）
    New-Item -ItemType Junction -Path (Join-Path $work 'node_modules') -Target (Join-Path $repo 'node_modules') | Out-Null
    Push-Location $work
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw 'build failed' }
        npx.cmd wrangler deploy
        if ($LASTEXITCODE -ne 0) { throw 'deploy failed' }
    } finally { Pop-Location }
} finally {
    $link = Get-Item (Join-Path $work 'node_modules') -Force -ErrorAction SilentlyContinue
    if ($link -and $link.LinkType -eq 'Junction') { $link.Delete() }
    git -C $repo worktree remove --force $work 2>$null
    if (Test-Path $work) { Remove-Item $work -Recurse -Force }
    git -C $repo worktree prune
}

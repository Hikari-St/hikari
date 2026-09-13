# Build Soroban contracts to optimized wasm32v1-none WebAssembly
# Author: ibochivincent-lang

$ErrorActionPreference = "Stop"

$packages = @(
    "hikari-vault",
    "hikari-token",
    "hikari-strategy-registry",
    "hikari-withdrawal-queue",
    "hikari-policy-account",
    "hikari-mock-strategy",
    "hikari-blend-adapter",
    "hikari-soroswap-adapter",
    "hikari-fee-controller",
    "hikari-phoenix-adapter",
    "hikari-gate-seal",
    "hikari-oracle"
)

$outDir = Join-Path $PSScriptRoot "..\contracts\wasm"
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$cargo = "$HOME\.cargo\bin\cargo.exe"
if (-not (Test-Path $cargo)) {
    $cargo = "cargo"
}

Write-Host "=================================================="
Write-Host "Compiling Hikari Soroban Contracts to WASM..."
Write-Host "Target: wasm32v1-none | Profile: release"
Write-Host "=================================================="

foreach ($pkg in $packages) {
    Write-Host "Building $pkg..."
    & $cargo rustc --manifest-path "$PSScriptRoot\..\contracts\Cargo.toml" -p $pkg --target wasm32v1-none --release --crate-type cdylib
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to build $pkg"
    }

    $wasmName = ($pkg.Replace("-", "_")) + ".wasm"
    $sourceWasm = Join-Path $PSScriptRoot "..\contracts\target\wasm32v1-none\release\$wasmName"
    $destWasm = Join-Path $outDir $wasmName
    Copy-Item $sourceWasm $destWasm -Force
    $size = (Get-Item $destWasm).Length
    Write-Host "Built: $wasmName ($size bytes)"
}

Write-Host "All WASM contracts successfully compiled and copied to $outDir"

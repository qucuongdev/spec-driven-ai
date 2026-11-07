param([string]$OutputPath)
$ErrorActionPreference = 'Stop'
$taskRepository = Split-Path -Parent $PSScriptRoot
$taskKit = [System.IO.Path]::GetFullPath((Join-Path $taskRepository 'kit'))
function Assert-PlainTree([string]$Directory) {
    $taskDirectory = Get-Item -LiteralPath $Directory -Force
    if ($taskDirectory.Attributes -band [System.IO.FileAttributes]::ReparsePoint) { throw "Refusing source symlink/junction/reparse point: $Directory" }
    foreach ($taskEntry in Get-ChildItem -LiteralPath $Directory -Force) {
        if ($taskEntry.Attributes -band [System.IO.FileAttributes]::ReparsePoint) { throw "Refusing source symlink/junction/reparse point: $($taskEntry.FullName)" }
        if ($taskEntry.PSIsContainer) { Assert-PlainTree $taskEntry.FullName }
    }
}
function Assert-PlainAncestors([string]$Path) {
    $taskAncestor = $Path
    while ($taskAncestor) {
        $taskItem = Get-Item -LiteralPath $taskAncestor -Force -ErrorAction SilentlyContinue
        if ($taskItem -and ($taskItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) { throw "Refusing output symlink/junction/reparse point: $taskAncestor" }
        $taskParent = [System.IO.Directory]::GetParent($taskAncestor)
        if ($null -eq $taskParent) { break }
        $taskAncestor = $taskParent.FullName
    }
}
Assert-PlainTree $taskKit
$taskEntries = @(Get-ChildItem -LiteralPath $taskKit -Force | Sort-Object Name | Select-Object -ExpandProperty Name)
if ($taskEntries.Count -ne 2 -or @(Compare-Object -ReferenceObject @('.aidlc', 'AGENTS.md') -DifferenceObject $taskEntries).Count -ne 0) { throw 'Kit must contain only AGENTS.md and .aidlc/.' }
if (-not (Test-Path -LiteralPath (Join-Path $taskKit '.aidlc/tools/cli.js') -PathType Leaf)) { throw 'Missing standalone helper.' }
if (-not $OutputPath) { $OutputPath = Join-Path $taskRepository 'artifacts/spec-driven-ai-kit.zip' }
$taskOutput = [System.IO.Path]::GetFullPath($OutputPath)
Assert-PlainAncestors $taskOutput
if ($taskOutput.StartsWith($taskKit + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Archive output cannot be inside the kit.' }
if (Test-Path -LiteralPath $taskOutput) { throw "Output already exists; choose a new path: $taskOutput" }
[System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($taskOutput)) | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
# ZipFile includes dot-directories such as .aidlc, unlike wildcard copy/archive flows.
[System.IO.Compression.ZipFile]::CreateFromDirectory($taskKit, $taskOutput, [System.IO.Compression.CompressionLevel]::Optimal, $false)
Write-Output $taskOutput

$ErrorActionPreference = "Stop"

$commit = "c18c7d267d46ab396641d5e44f1ce3166aeb9a6d"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$destination = Join-Path $root ".cache\upstream"

$files = @(
    @{
        Path = "pgledger.sql"
        Hash = "FC41721E718630C5D98E39788045C4E75CBA5DB922EF6BF00C63973933960720"
    },
    @{
        Path = "vendor/scoville-pgsql-ulid/uuid-to-ulid.sql"
        Hash = "507CC0CF4890FC51F2DD900B52E5F5EEFB38F6C5150CDB9A32A886C3817AD04E"
    },
    @{
        Path = "vendor/scoville-pgsql-ulid/ulid-to-uuid.sql"
        Hash = "6A4E559C956D1548AD6AB0C4D99755BF5E870A781AE15E0FF178F5D66F8DEB90"
    },
    @{
        Path = "LICENSE"
        Hash = "644EB6474436995540CEDA2D30188CEEF9284A5F64F5D87F7C3DCFC8CB8BDDC7"
    }
)

New-Item -ItemType Directory -Force -Path $destination | Out-Null

foreach ($file in $files) {
    $localName = Split-Path $file.Path -Leaf
    $localPath = Join-Path $destination $localName
    $isValid = Test-Path -LiteralPath $localPath

    if ($isValid) {
        $isValid = (Get-FileHash -Algorithm SHA256 -LiteralPath $localPath).Hash -eq $file.Hash
    }

    if (-not $isValid) {
        $url = "https://raw.githubusercontent.com/pgr0ss/pgledger/$commit/$($file.Path)"
        Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $localPath
    }

    $actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $localPath).Hash
    if ($actualHash -ne $file.Hash) {
        throw "SHA-256 inválido para $($file.Path). Esperado $($file.Hash), obtenido $actualHash."
    }

    Write-Output "verified $localName $actualHash"
}

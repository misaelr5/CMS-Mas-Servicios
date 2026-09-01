param(
    [switch]$KeepEnvironment
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path $PSScriptRoot
$previousLocation = Get-Location

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command,
        [Parameter(Mandatory = $true)]
        [string]$Label
    )

    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Label falló con exit code $LASTEXITCODE."
    }
}

try {
    Set-Location $root

    & "$root\scripts\fetch-pgledger.ps1"

    docker compose --progress quiet down --volumes --remove-orphans 2>&1 | Out-Null
    Invoke-Checked { docker compose up --detach --wait } "Inicio de PostgreSQL"

    Write-Output "=== ENVIRONMENT ==="
    Invoke-Checked {
        docker compose exec -T postgres psql -U spike_admin -d pgledger_spike -Atc "select version(); select 'isolation=' || current_setting('transaction_isolation');"
    } "Consulta de versión PostgreSQL"

    Write-Output "=== INSTALL FIXED PGLEDGER ==="
    foreach ($file in @(
        "/workspace/upstream/uuid-to-ulid.sql",
        "/workspace/upstream/ulid-to-uuid.sql",
        "/workspace/upstream/pgledger.sql",
        "/workspace/sql/10-spike-schema.sql",
        "/workspace/sql/20-test-support.sql"
    )) {
        Invoke-Checked {
            docker compose exec -T postgres psql -X -v ON_ERROR_STOP=1 -U spike_admin -d pgledger_spike -f $file
        } "Carga de $file"
    }

    Write-Output "=== TEST A: CONCURRENCY (10 ROUNDS) ==="
    Invoke-Checked {
        docker compose exec -T postgres sh /workspace/scripts/test-concurrency.sh
    } "Test de concurrencia"

    Write-Output "=== TEST B: FX ATOMICITY + ROLLBACK ==="
    Invoke-Checked {
        docker compose exec -T postgres psql -X -v ON_ERROR_STOP=1 -U spike_admin -d pgledger_spike -f /workspace/sql/30-fx-atomicity.sql
    } "Test de FX y rollback"

    Write-Output "=== TEST C: REVERSAL ==="
    Invoke-Checked {
        docker compose exec -T postgres psql -X -v ON_ERROR_STOP=1 -U spike_admin -d pgledger_spike -f /workspace/sql/40-reversal.sql
    } "Test de reversión"

    Write-Output "=== TEST D: IDEMPOTENCY (SEQUENTIAL) ==="
    Invoke-Checked {
        docker compose exec -T postgres psql -X -v ON_ERROR_STOP=1 -U spike_admin -d pgledger_spike -f /workspace/sql/50-idempotency.sql
    } "Test de idempotencia secuencial"

    Write-Output "=== TEST D: IDEMPOTENCY (CONCURRENT) ==="
    Invoke-Checked {
        docker compose exec -T postgres sh /workspace/scripts/test-idempotency-concurrent.sh
    } "Test de idempotencia concurrente"

    Write-Output "=== RPC ISOLATION ==="
    Invoke-Checked {
        docker compose exec -T postgres sh /workspace/scripts/test-rpc-isolation.sh
    } "Test de aislamiento RPC"

    Write-Output "=== SPIKE RESULT ==="
    Write-Output "CONCURRENCY=PASS"
    Write-Output "FX_ATOMICITY=PASS"
    Write-Output "ROLLBACK=PASS"
    Write-Output "REVERSAL=PASS"
    Write-Output "IDEMPOTENCY=PASS"
    Write-Output "RPC_ISOLATION=PASS"
}
finally {
    if (-not $KeepEnvironment) {
        $cleanupErrorPreference = $ErrorActionPreference
        $ErrorActionPreference = "SilentlyContinue"
        docker compose --progress quiet down --volumes --remove-orphans 2>&1 | Out-Null
        $ErrorActionPreference = $cleanupErrorPreference
    }
    Set-Location $previousLocation
}

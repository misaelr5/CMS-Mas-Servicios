# pgledger POC

Spike desechable y aislado para validar `pgledger` antes de integrarlo al CMS.
No carga migraciones ni datos de `CMS-Mas-Servicios`.

## Versión fijada

- Repositorio: <https://github.com/pgr0ss/pgledger>
- Commit: `c18c7d267d46ab396641d5e44f1ce3166aeb9a6d`
- Fecha del commit: 2026-07-06
- Licencia: MIT

`scripts/fetch-pgledger.ps1` descarga cuatro archivos desde ese commit y
verifica sus SHA-256 antes de iniciar PostgreSQL.

## Ejecución

Requisito único: Docker Desktop con el daemon iniciado.

```powershell
Set-Location spikes/pgledger-poc
.\run-spike.ps1
```

El runner:

1. prepara el upstream fijado dentro de `.cache/`;
2. inicia PostgreSQL 17.6 en `127.0.0.1:55432` con almacenamiento `tmpfs`;
3. instala el SQL upstream únicamente en la base `pgledger_spike`;
4. crea wrappers y tablas de prueba;
5. ejecuta concurrencia diez veces, FX, rollback, reversión, idempotencia y permisos;
6. destruye el contenedor al finalizar.

Usar `-KeepEnvironment` solamente para inspección manual. Para destruirlo:

```powershell
docker compose down --volumes --remove-orphans
```
## Archivos

- `compose.yaml`: PostgreSQL efímero y fijado por digest.
- `run-spike.ps1`: orquestador reproducible.
- `scripts/fetch-pgledger.ps1`: descarga y verifica pgledger.
- `scripts/test-concurrency.sh`: carreras 800/500 repetidas.
- `scripts/test-idempotency-concurrent.sh`: doble submit simultáneo.
- `scripts/test-rpc-isolation.sh`: permisos negativos y wrapper autorizado.
- `sql/10-spike-schema.sql`: contrato mínimo de dominio y RPC.
- `sql/20-test-support.sql`: cuatro cuentas de caja, clearing, funding y asserts.
- `sql/30-fx-atomicity.sql`: compra FX y rollback intencional.
- `sql/40-reversal.sql`: venta y compensación.
- `sql/50-idempotency.sql`: replay secuencial y conflicto de payload.

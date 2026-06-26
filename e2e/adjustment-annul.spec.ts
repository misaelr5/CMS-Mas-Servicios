import { test, expect } from "@playwright/test";

// Test del flujo COMPLETO de crear + anular un ajuste de reporte diario.
//
// ⚠️ MUTA DATOS (crea y anula un ajuste real + audit logs). Por eso está
// gateado: solo corre si E2E_MUTATING=1.
//
//   Windows PowerShell:  $env:E2E_MUTATING=1; pnpm e2e
//   bash:                E2E_MUTATING=1 pnpm e2e
//
// Verifica el fix de annulDailyReportAdjustmentAction: antes el check de
// sucursal leía branch_id de report_adjustments (columna inexistente) y la
// anulación SIEMPRE fallaba.

const EMAIL = process.env.E2E_EMAIL ?? "roman@maservicios.ar";
const PASSWORD = process.env.E2E_PASSWORD ?? "Rom5an";

test.describe("flujo crear + anular ajuste (muta datos)", () => {
  test.skip(process.env.E2E_MUTATING !== "1", "Gateado: definí E2E_MUTATING=1 para correrlo.");

  test("crea un ajuste y luego lo anula correctamente", async ({ page }) => {
    // Reason único para poder ubicar exactamente el ajuste que creamos.
    const uniqueReason = `E2E ajuste ${Date.now()}`;

    // 1. Login
    await page.goto("/login");
    await page.fill("#email", EMAIL);
    await page.fill("#password", PASSWORD);
    await page.getByRole("button", { name: /ingresar/i }).click();
    await page.waitForURL(/\/(dashboard|bolsas)/, { timeout: 30_000 });

    // 2. Ir a reporte diario
    await page.goto("/reporte-diario");

    // 3. Crear ajuste en el primer form (primera sucursal con reporte abierto)
    const createForm = page
      .locator("form", { has: page.getByRole("button", { name: /crear ajuste/i }) })
      .first();
    await expect(createForm).toBeVisible({ timeout: 20_000 });
    await createForm.locator('select[name="adjustment_type"]').selectOption({ index: 0 });
    await createForm.locator('input[name="amount_ars"]').fill("123");
    await createForm.locator('input[name="reason"]').fill(uniqueReason);
    await createForm.getByRole("button", { name: /crear ajuste/i }).click();

    // 4. El ajuste aparece en la lista (card con el reason único)
    const card = page.locator("div.rounded-2xl", { hasText: uniqueReason });
    await expect(card).toBeVisible({ timeout: 20_000 });

    // 5. Anular ese ajuste desde su propio form
    await card.locator('input[name="reason"]').fill("E2E anulacion");
    await card.getByRole("button", { name: /^anular$/i }).click();

    // 6. Confirmar éxito del fix: tras anular, el ajuste se filtra de la lista
    //    y su card desaparece. Antes del fix la anulación SIEMPRE fallaba, por
    //    lo que el card seguia visible.
    await expect(card).toHaveCount(0, { timeout: 20_000 });
  });
});

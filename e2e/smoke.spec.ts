import { test, expect } from "@playwright/test";

// Smoke test del flujo crítico. No muta datos: verifica health, login y que
// la página que hostea la creación/anulación de ajustes renderice.
//
// Credenciales del usuario dev (override con E2E_EMAIL / E2E_PASSWORD).
const EMAIL = process.env.E2E_EMAIL ?? "roman@maservicios.ar";
const PASSWORD = process.env.E2E_PASSWORD ?? "Rom5an";

test("health endpoint responde ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe("ok");
  expect(body.env.ok).toBe(true);
  expect(body.db.ok).toBe(true);
});

test("la página de login renderiza", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
});

test("login y reporte-diario muestran el form de ajuste", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: /ingresar/i }).click();

  // Tras el login el usuario admin aterriza en /dashboard (cajero en /bolsas).
  await page.waitForURL(/\/(dashboard|bolsas)/, { timeout: 30_000 });

  await page.goto("/reporte-diario");
  // El form de creación de ajuste aparece una vez por sucursal (admin/encargado,
  // reportes abiertos). Basta con que haya al menos uno visible.
  const crearAjuste = page.getByRole("button", { name: /crear ajuste/i });
  await expect(crearAjuste.first()).toBeVisible({ timeout: 20_000 });
  expect(await crearAjuste.count()).toBeGreaterThan(0);
});

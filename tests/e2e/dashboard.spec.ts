import { test, expect } from "@playwright/test";
import { loginAsYamada, loginAsSuzuki } from "./helpers/auth";

// E2E-DSH-001 〜 E2E-DSH-003
// 前提: グローバルセットアップで
//   - 山田の日報: 2026-05-06, 2026-05-08
//   - 田中の日報: 2026-06-01

test.describe("ダッシュボード検索フロー", () => {
  test("E2E-DSH-001: 期間絞り込み", async ({ page }) => {
    await loginAsYamada(page);

    // 期間を 2026-05-01〜2026-05-07 に絞り込む
    await page.goto("/?from=2026-05-01&to=2026-05-07");

    // 2026-05-06 の日報は表示される
    await expect(page.getByRole("cell", { name: "2026/05/06" })).toBeVisible();

    // 2026-05-08 の日報は表示されない
    await expect(page.getByRole("cell", { name: "2026/05/08" })).not.toBeVisible();
  });

  test("E2E-DSH-002: 上長による担当者絞り込み", async ({ page }) => {
    await loginAsSuzuki(page);

    // 担当者ドロップダウンで山田を選択
    await page.goto("/?from=2026-05-01&to=2026-06-30");

    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "山田 太郎" }).click();
    await page.getByRole("button", { name: "検索" }).click();

    // 山田の日報は表示される
    await expect(page.getByText("山田 太郎")).toBeVisible();

    // 田中の日報は表示されない
    await expect(page.getByText("田中 次郎")).not.toBeVisible();
  });

  test("E2E-DSH-003: 営業には担当者ドロップダウンが表示されない", async ({ page }) => {
    await loginAsYamada(page);

    // 担当者ドロップダウンが存在しない（isManager = false）
    await expect(page.locator('label:has-text("担当者")')).not.toBeVisible();
  });
});

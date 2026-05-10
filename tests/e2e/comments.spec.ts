import { test, expect } from "@playwright/test";
import { loginAsYamada, loginAsSuzuki } from "./helpers/auth";

// E2E-CMT-001 〜 E2E-CMT-003
// 前提: グローバルセットアップで山田の提出済み日報（2026-05-06）が存在する

test.describe("コメント・確認フロー", () => {
  async function navigateToYamadaReport(page: Parameters<typeof loginAsYamada>[0]) {
    // ダッシュボードで山田の提出済み日報を探して詳細へ遷移
    await page.goto("/?from=2026-05-01&to=2026-05-31");
    const viewLink = page.getByRole("link", { name: "閲覧" }).first();
    await viewLink.click();
    await page.waitForURL(/\/reports\/\d+/);
  }

  test("E2E-CMT-001: 上長によるコメント投稿", async ({ page }) => {
    await loginAsSuzuki(page);
    await navigateToYamadaReport(page);

    // コメント入力欄が表示される
    await expect(page.getByPlaceholder("コメントを入力してください")).toBeVisible();

    // コメント入力
    await page.getByPlaceholder("コメントを入力してください").fill("対応策を検討してください。");

    // 送信
    await page.getByRole("button", { name: "コメントを送信" }).click();

    // コメントが画面に反映される
    await expect(page.getByText("対応策を検討してください。")).toBeVisible();
    await expect(page.getByText("鈴木 部長")).toBeVisible();
  });

  test("E2E-CMT-002: 営業にはコメント入力欄が表示されない", async ({ page }) => {
    await loginAsYamada(page);
    await navigateToYamadaReport(page);

    // コメント入力欄・送信ボタンが表示されない
    await expect(page.getByPlaceholder("コメントを入力してください")).not.toBeVisible();
    await expect(page.getByRole("button", { name: "コメントを送信" })).not.toBeVisible();
  });

  test("E2E-CMT-003: 上長による「確認済み」操作", async ({ page }) => {
    await loginAsSuzuki(page);

    // 2026-05-08の別の提出済み日報へ遷移
    await page.goto("/?from=2026-05-08&to=2026-05-08");
    const viewLink = page.getByRole("link", { name: "閲覧" }).first();
    await viewLink.click();
    await page.waitForURL(/\/reports\/\d+/);

    // 確認済みにするボタンを押下
    await page.getByRole("button", { name: "確認済みにする" }).click();

    // ステータスが確認済みに更新される
    await expect(page.getByText("確認済み")).toBeVisible();
    // 確認済みにするボタンが消える
    await expect(page.getByRole("button", { name: "確認済みにする" })).not.toBeVisible();
  });
});

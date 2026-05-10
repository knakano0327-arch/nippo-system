import { test, expect } from "@playwright/test";

// E2E-AUTH-001 / E2E-AUTH-002 / E2E-AUTH-003

test.describe("認証フロー", () => {
  test("E2E-AUTH-001: 正常ログイン → ダッシュボードへ遷移", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("メールアドレス").fill("yamada@test.com");
    await page.getByLabel("パスワード").fill("password123");
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "日報一覧" })).toBeVisible();
  });

  test("E2E-AUTH-002: パスワード誤り → エラーメッセージ表示", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("メールアドレス").fill("yamada@test.com");
    await page.getByLabel("パスワード").fill("wrongpassword");
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page.getByRole("alert")).toContainText(
      "メールアドレスまたはパスワードが正しくありません",
    );
    await expect(page).toHaveURL("/login");
  });

  test("E2E-AUTH-003: 未入力バリデーション → 各バリデーションエラー表示", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page.getByText("メールアドレスを正しい形式で入力してください")).toBeVisible();
    await expect(page.getByText("パスワードを入力してください")).toBeVisible();
  });
});

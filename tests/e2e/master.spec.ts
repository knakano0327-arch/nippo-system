import { test, expect } from "@playwright/test";
import { loginAsYamada, loginAsAdmin } from "./helpers/auth";

// E2E-MST-001 〜 E2E-MST-003

test.describe("マスタ管理フロー", () => {
  test("E2E-MST-001: 顧客登録〜一覧反映", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/master/customers");

    // 新規登録ボタン
    await page.getByRole("link", { name: "新規登録" }).click();
    await expect(page).toHaveURL("/master/customers/new");

    // 顧客情報入力
    await page.getByLabel("顧客名").fill("株式会社テスト商事");

    // 業種選択
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "商社" }).click();

    // 保存
    await page.getByRole("button", { name: "登録する" }).click();

    // 一覧画面へ遷移
    await expect(page).toHaveURL("/master/customers");

    // 登録した顧客が一覧に表示される
    await expect(page.getByText("株式会社テスト商事")).toBeVisible();
  });

  test("E2E-MST-002: 顧客削除確認ダイアログ（キャンセル）", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/master/customers");

    // A商事の削除ボタン押下
    const aShoji = page.getByRole("row", { name: /株式会社A商事/ });
    await aShoji.getByRole("button", { name: "削除" }).click();

    // 確認ダイアログが表示される
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("株式会社A商事")).toBeVisible();

    // キャンセルを選択
    await page.getByRole("button", { name: "キャンセル" }).click();

    // ダイアログが閉じる
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // 削除されず一覧に残る
    await expect(page.getByText("株式会社A商事")).toBeVisible();
  });

  test("E2E-MST-003: 営業マスタへのアクセス制限", async ({ page }) => {
    await loginAsYamada(page);

    // 営業一般ユーザーが /master/salespersons へアクセス
    await page.goto("/master/salespersons");

    // ダッシュボードへリダイレクトされる
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "日報一覧" })).toBeVisible();
  });
});

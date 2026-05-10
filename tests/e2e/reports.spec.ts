import { test, expect } from "@playwright/test";
import { loginAsYamada } from "./helpers/auth";

// E2E-RPT-001 〜 E2E-RPT-007

test.describe("日報作成フロー", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsYamada(page);
  });

  test("E2E-RPT-001: 日報作成〜提出の正常フロー", async ({ page }) => {
    await page.getByRole("link", { name: "新規作成" }).click();
    await expect(page).toHaveURL("/reports/new");

    // 日付入力
    await page.locator('input[type="date"]').fill("2026-01-10");

    // 顧客選択
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "株式会社A商事" }).click();

    // 訪問内容
    await page.getByPlaceholder("訪問内容を入力してください").fill("A社との商談実施");

    // Problem / Plan
    await page
      .getByPlaceholder("課題や上長への相談を記入してください")
      .fill("A社の承認が遅れている");
    await page.getByPlaceholder("翌日の行動計画を記入してください").fill("B社を訪問する");

    // 提出
    await page.getByRole("button", { name: "提出" }).click();
    await page.waitForURL(/\/reports\/\d+/);

    await expect(page.getByText("提出済み")).toBeVisible();
    await expect(page.getByText("A社との商談実施")).toBeVisible();
  });

  test("E2E-RPT-002: 一時保存（下書き）", async ({ page }) => {
    await page.getByRole("link", { name: "新規作成" }).click();

    await page.locator('input[type="date"]').fill("2026-01-11");

    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "株式会社B製造" }).click();

    await page.getByPlaceholder("訪問内容を入力してください").fill("B社との打ち合わせ");

    await page.getByRole("button", { name: "一時保存" }).click();
    await expect(page).toHaveURL("/");

    await expect(page.getByText("下書き")).toBeVisible();
  });

  test("E2E-RPT-003: 訪問記録の複数行追加", async ({ page }) => {
    await page.getByRole("link", { name: "新規作成" }).click();

    // 初期1行を確認
    await expect(page.getByText("訪問先 1")).toBeVisible();

    // 3回追加 → 合計4行
    const addButton = page.getByRole("button", { name: "訪問先を追加" });
    await addButton.click();
    await addButton.click();
    await addButton.click();

    await expect(page.getByText("訪問先 1")).toBeVisible();
    await expect(page.getByText("訪問先 2")).toBeVisible();
    await expect(page.getByText("訪問先 3")).toBeVisible();
    await expect(page.getByText("訪問先 4")).toBeVisible();
  });

  test("E2E-RPT-004: 訪問記録の行削除", async ({ page }) => {
    await page.getByRole("link", { name: "新規作成" }).click();

    // 1行追加
    await page.getByRole("button", { name: "訪問先を追加" }).click();
    await expect(page.getByText("訪問先 2")).toBeVisible();

    // 2行目を削除
    await page.getByRole("button", { name: "訪問先 2 を削除" }).click();

    await expect(page.getByText("訪問先 2")).not.toBeVisible();
    await expect(page.getByText("訪問先 1")).toBeVisible();
  });

  test("E2E-RPT-005: 1行目の削除ボタン非活性確認", async ({ page }) => {
    await page.getByRole("link", { name: "新規作成" }).click();

    // 1行のみの状態で1行目削除ボタンが非表示
    const firstDeleteButton = page.getByRole("button", { name: "訪問先 1 を削除" });
    await expect(firstDeleteButton).not.toBeVisible();
  });

  test("E2E-RPT-006: キャンセル時の確認ダイアログ", async ({ page }) => {
    await page.getByRole("link", { name: "新規作成" }).click();

    await page.getByPlaceholder("課題や上長への相談を記入してください").fill("入力中のデータ");

    // キャンセルボタン押下
    await page.getByRole("button", { name: "キャンセル" }).click();

    // 確認ダイアログが表示される
    await expect(page.getByRole("dialog")).toBeVisible();

    // 中止するを押下
    await page.getByRole("button", { name: "中止する" }).click();

    await expect(page).toHaveURL("/");
  });

  test("E2E-RPT-007: 未入力バリデーション（提出時）", async ({ page }) => {
    await page.getByRole("link", { name: "新規作成" }).click();

    // 顧客・訪問内容を空のまま提出
    await page.getByRole("button", { name: "提出" }).click();

    // バリデーションエラー表示
    await expect(page.getByText("顧客を選択してください")).toBeVisible();
    await expect(page.getByText("訪問内容を入力してください")).toBeVisible();

    // 画面遷移しない
    await expect(page).toHaveURL("/reports/new");
  });
});

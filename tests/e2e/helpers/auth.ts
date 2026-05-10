import type { Page } from "@playwright/test";

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill(password);
  await page.getByRole("button", { name: "ログイン" }).click();
  await page.waitForURL("/");
}

export async function loginAsYamada(page: Page) {
  await login(page, "yamada@test.com", "password123");
}

export async function loginAsSuzuki(page: Page) {
  await login(page, "suzuki@test.com", "password123");
}

export async function loginAsAdmin(page: Page) {
  await login(page, "admin@test.com", "password123");
}

# 営業日報システム API仕様書

**バージョン:** 1.0  
**作成日:** 2026-05-08  
**ベースURL:** `https://api.example.com/v1`  
**データ形式:** JSON  
**文字コード:** UTF-8

---

## 目次

1. [共通仕様](#1-共通仕様)
2. [認証 API](#2-認証-api)
3. [日報 API](#3-日報-api)
4. [訪問記録 API](#4-訪問記録-api)
5. [コメント API](#5-コメント-api)
6. [顧客マスタ API](#6-顧客マスタ-api)
7. [営業マスタ API](#7-営業マスタ-api)
8. [エラーレスポンス一覧](#8-エラーレスポンス一覧)

---

## 1. 共通仕様

### 1.1 認証

ログイン後に発行される JWT トークンを、すべてのリクエストのリクエストヘッダーに付与してください。

```
Authorization: Bearer <token>
```

### 1.2 共通リクエストヘッダー

| ヘッダー名 | 必須 | 値 |
|-----------|------|-----|
| `Content-Type` | ○（POST/PUT/PATCH時） | `application/json` |
| `Authorization` | ○（ログイン以外） | `Bearer <token>` |

### 1.3 ページネーション

一覧取得系APIはページネーションに対応しています。

**クエリパラメーター**

| パラメーター | 型 | デフォルト | 説明 |
|------------|-----|----------|------|
| `page` | integer | 1 | ページ番号（1始まり） |
| `per_page` | integer | 20 | 1ページあたりの件数（最大100） |

**レスポンスボディ（共通ラッパー）**

```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "per_page": 20,
    "total_pages": 5
  }
}
```

### 1.4 日時フォーマット

すべての日時は ISO 8601 形式（`YYYY-MM-DDTHH:mm:ssZ`）、日付は `YYYY-MM-DD` で返します。

### 1.5 ステータスコード

| コード | 意味 |
|--------|------|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity |
| 500 | Internal Server Error |

---

## 2. 認証 API

### 2.1 ログイン

```
POST /auth/login
```

**リクエストボディ**

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `email` | string | ○ | メールアドレス |
| `password` | string | ○ | パスワード |

```json
{
  "email": "yamada@example.com",
  "password": "password123"
}
```

**レスポンス（200 OK）**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_at": "2026-05-09T10:00:00Z",
  "user": {
    "id": 1,
    "name": "山田 太郎",
    "email": "yamada@example.com",
    "department": "東京営業部",
    "is_manager": false
  }
}
```

**エラーレスポンス**

| ステータス | エラーコード | 説明 |
|----------|------------|------|
| 401 | `INVALID_CREDENTIALS` | メールアドレスまたはパスワードが不正 |

---

### 2.2 ログアウト

```
POST /auth/logout
```

**レスポンス（204 No Content）**

---

### 2.3 トークンリフレッシュ

```
POST /auth/refresh
```

**レスポンス（200 OK）**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_at": "2026-05-09T12:00:00Z"
}
```

---

## 3. 日報 API

### 日報オブジェクト

```json
{
  "id": 101,
  "salesperson_id": 1,
  "salesperson_name": "山田 太郎",
  "report_date": "2026-05-08",
  "problem": "A社の予算承認が遅れており、今月中のクローズが難しい状況です。",
  "plan": "明日はB社へ訪問し、提案書を提出する。",
  "status": "submitted",
  "visit_count": 3,
  "has_comment": true,
  "created_at": "2026-05-08T18:00:00Z",
  "updated_at": "2026-05-08T18:30:00Z"
}
```

**status の値**

| 値 | 意味 |
|----|------|
| `draft` | 下書き |
| `submitted` | 提出済み |
| `reviewed` | 確認済み |

---

### 3.1 日報一覧取得

```
GET /reports
```

**クエリパラメーター**

| パラメーター | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `from` | string (date) | - | 期間絞り込み（開始日）例: `2026-05-01` |
| `to` | string (date) | - | 期間絞り込み（終了日）例: `2026-05-31` |
| `salesperson_id` | integer | - | 担当者絞り込み（上長・管理者のみ指定可） |
| `status` | string | - | ステータス絞り込み: `draft` / `submitted` / `reviewed` |
| `page` | integer | - | ページ番号（デフォルト: 1） |
| `per_page` | integer | - | 件数（デフォルト: 20） |

**レスポンス（200 OK）**

```json
{
  "data": [
    {
      "id": 101,
      "salesperson_id": 1,
      "salesperson_name": "山田 太郎",
      "report_date": "2026-05-08",
      "status": "submitted",
      "visit_count": 3,
      "has_comment": true,
      "created_at": "2026-05-08T18:00:00Z",
      "updated_at": "2026-05-08T18:30:00Z"
    }
  ],
  "pagination": {
    "total": 42,
    "page": 1,
    "per_page": 20,
    "total_pages": 3
  }
}
```

> **権限:** 一般営業は自分の日報のみ返却。上長・管理者は部下全員分を返却。

---

### 3.2 日報詳細取得

```
GET /reports/:id
```

**パスパラメーター**

| パラメーター | 型 | 説明 |
|------------|-----|------|
| `id` | integer | 日報ID |

**レスポンス（200 OK）**

```json
{
  "id": 101,
  "salesperson_id": 1,
  "salesperson_name": "山田 太郎",
  "report_date": "2026-05-08",
  "problem": "A社の予算承認が遅れており、今月中のクローズが難しい状況です。",
  "plan": "明日はB社へ訪問し、提案書を提出する。",
  "status": "submitted",
  "created_at": "2026-05-08T18:00:00Z",
  "updated_at": "2026-05-08T18:30:00Z",
  "visit_records": [
    {
      "id": 201,
      "customer_id": 10,
      "customer_name": "株式会社A商事",
      "visit_content": "今月末の契約に向けて最終確認。先方の決裁者と面談実施。",
      "sort_order": 1
    }
  ],
  "comments": [
    {
      "id": 301,
      "commenter_id": 5,
      "commenter_name": "鈴木 部長",
      "target_type": "problem",
      "content": "先方の担当役員へ直接アプローチする方法を検討してみてください。",
      "created_at": "2026-05-08T20:00:00Z",
      "updated_at": "2026-05-08T20:00:00Z"
    }
  ]
}
```

**エラーレスポンス**

| ステータス | エラーコード | 説明 |
|----------|------------|------|
| 403 | `FORBIDDEN` | 他人の日報への不正アクセス |
| 404 | `NOT_FOUND` | 指定IDの日報が存在しない |

---

### 3.3 日報作成

```
POST /reports
```

**リクエストボディ**

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `report_date` | string (date) | ○ | 対象日 |
| `problem` | string | - | 課題・相談（最大2000文字） |
| `plan` | string | - | 翌日の行動計画（最大2000文字） |
| `status` | string | ○ | `draft` または `submitted` |
| `visit_records` | array | ○ | 訪問記録（1件以上必須） |
| `visit_records[].customer_id` | integer | ○ | 顧客ID |
| `visit_records[].visit_content` | string | ○ | 訪問内容（最大1000文字） |
| `visit_records[].sort_order` | integer | ○ | 表示順 |

```json
{
  "report_date": "2026-05-08",
  "problem": "A社の予算承認が遅れております。",
  "plan": "明日はB社へ訪問し、提案書を提出する。",
  "status": "submitted",
  "visit_records": [
    {
      "customer_id": 10,
      "visit_content": "今月末の契約に向けて最終確認。先方の決裁者と面談実施。",
      "sort_order": 1
    },
    {
      "customer_id": 11,
      "visit_content": "新規提案のためのヒアリングを実施。",
      "sort_order": 2
    }
  ]
}
```

**レスポンス（201 Created）**

作成した日報の詳細オブジェクトを返します（3.2と同形式）。

**エラーレスポンス**

| ステータス | エラーコード | 説明 |
|----------|------------|------|
| 409 | `DUPLICATE_REPORT` | 同一日付の日報がすでに存在する |
| 422 | `VALIDATION_ERROR` | バリデーションエラー |

---

### 3.4 日報更新

```
PUT /reports/:id
```

リクエストボディは [3.3 日報作成](#33-日報作成) と同形式。

> **権限:** 本人かつ `draft` ステータスの日報のみ更新可能。

**レスポンス（200 OK）**

更新後の日報詳細オブジェクトを返します（3.2と同形式）。

**エラーレスポンス**

| ステータス | エラーコード | 説明 |
|----------|------------|------|
| 403 | `FORBIDDEN` | 他人の日報、または `draft` 以外のステータス |
| 404 | `NOT_FOUND` | 指定IDの日報が存在しない |
| 422 | `VALIDATION_ERROR` | バリデーションエラー |

---

### 3.5 日報ステータス更新（確認済みにする）

```
PATCH /reports/:id/status
```

**リクエストボディ**

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `status` | string | ○ | `reviewed` のみ指定可 |

```json
{
  "status": "reviewed"
}
```

> **権限:** 上長・管理者のみ実行可能。

**レスポンス（200 OK）**

```json
{
  "id": 101,
  "status": "reviewed",
  "updated_at": "2026-05-08T21:00:00Z"
}
```

**エラーレスポンス**

| ステータス | エラーコード | 説明 |
|----------|------------|------|
| 403 | `FORBIDDEN` | 上長・管理者以外による操作 |
| 404 | `NOT_FOUND` | 指定IDの日報が存在しない |

---

### 3.6 日報削除

```
DELETE /reports/:id
```

> **権限:** 本人かつ `draft` ステータスの日報のみ削除可能。

**レスポンス（204 No Content）**

**エラーレスポンス**

| ステータス | エラーコード | 説明 |
|----------|------------|------|
| 403 | `FORBIDDEN` | 他人の日報、または `draft` 以外のステータス |
| 404 | `NOT_FOUND` | 指定IDの日報が存在しない |

---

## 4. 訪問記録 API

訪問記録の追加・更新・削除は、[3.3 日報作成](#33-日報作成) / [3.4 日報更新](#34-日報更新) の `visit_records` フィールドでまとめて操作することを基本とします。

単体での操作が必要な場合は以下のエンドポイントを使用してください。

---

### 4.1 訪問記録追加

```
POST /reports/:report_id/visit_records
```

**リクエストボディ**

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `customer_id` | integer | ○ | 顧客ID |
| `visit_content` | string | ○ | 訪問内容（最大1000文字） |
| `sort_order` | integer | ○ | 表示順 |

**レスポンス（201 Created）**

```json
{
  "id": 202,
  "daily_report_id": 101,
  "customer_id": 12,
  "customer_name": "株式会社C物産",
  "visit_content": "定例ミーティングを実施。次回提案日程を調整。",
  "sort_order": 3,
  "created_at": "2026-05-08T18:10:00Z"
}
```

---

### 4.2 訪問記録更新

```
PUT /reports/:report_id/visit_records/:id
```

リクエストボディは [4.1](#41-訪問記録追加) と同形式。

**レスポンス（200 OK）**

更新後の訪問記録オブジェクトを返します。

---

### 4.3 訪問記録削除

```
DELETE /reports/:report_id/visit_records/:id
```

**レスポンス（204 No Content）**

**エラーレスポンス**

| ステータス | エラーコード | 説明 |
|----------|------------|------|
| 400 | `LAST_RECORD` | 訪問記録が1件しかない場合は削除不可 |

---

## 5. コメント API

### コメントオブジェクト

```json
{
  "id": 301,
  "daily_report_id": 101,
  "commenter_id": 5,
  "commenter_name": "鈴木 部長",
  "target_type": "problem",
  "content": "先方の担当役員へ直接アプローチする方法を検討してみてください。",
  "created_at": "2026-05-08T20:00:00Z",
  "updated_at": "2026-05-08T20:00:00Z"
}
```

**target_type の値**

| 値 | 意味 |
|----|------|
| `problem` | Problem（課題・相談）へのコメント |
| `plan` | Plan（翌日の行動計画）へのコメント |

---

### 5.1 コメント投稿

```
POST /reports/:report_id/comments
```

> **権限:** 上長・管理者のみ実行可能。

**リクエストボディ**

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `target_type` | string | ○ | `problem` または `plan` |
| `content` | string | ○ | コメント内容（最大1000文字） |

```json
{
  "target_type": "problem",
  "content": "先方の担当役員へ直接アプローチする方法を検討してみてください。"
}
```

**レスポンス（201 Created）**

コメントオブジェクトを返します。

**エラーレスポンス**

| ステータス | エラーコード | 説明 |
|----------|------------|------|
| 403 | `FORBIDDEN` | 上長・管理者以外による操作 |
| 404 | `NOT_FOUND` | 指定IDの日報が存在しない |
| 422 | `VALIDATION_ERROR` | バリデーションエラー |

---

### 5.2 コメント更新

```
PUT /reports/:report_id/comments/:id
```

> **権限:** コメント投稿者本人のみ更新可能。

**リクエストボディ**

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `content` | string | ○ | コメント内容（最大1000文字） |

**レスポンス（200 OK）**

更新後のコメントオブジェクトを返します。

---

### 5.3 コメント削除

```
DELETE /reports/:report_id/comments/:id
```

> **権限:** コメント投稿者本人のみ削除可能。

**レスポンス（204 No Content）**

---

## 6. 顧客マスタ API

### 顧客オブジェクト

```json
{
  "id": 10,
  "name": "株式会社A商事",
  "address": "東京都千代田区丸の内1-1-1",
  "phone": "03-1234-5678",
  "industry": "商社",
  "created_at": "2026-01-10T09:00:00Z",
  "updated_at": "2026-01-10T09:00:00Z"
}
```

---

### 6.1 顧客一覧取得

```
GET /customers
```

**クエリパラメーター**

| パラメーター | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `name` | string | - | 顧客名（部分一致） |
| `industry` | string | - | 業種で絞り込み |
| `page` | integer | - | ページ番号 |
| `per_page` | integer | - | 件数 |

**レスポンス（200 OK）**

```json
{
  "data": [
    {
      "id": 10,
      "name": "株式会社A商事",
      "address": "東京都千代田区丸の内1-1-1",
      "phone": "03-1234-5678",
      "industry": "商社",
      "created_at": "2026-01-10T09:00:00Z",
      "updated_at": "2026-01-10T09:00:00Z"
    }
  ],
  "pagination": {
    "total": 80,
    "page": 1,
    "per_page": 20,
    "total_pages": 4
  }
}
```

---

### 6.2 顧客詳細取得

```
GET /customers/:id
```

**レスポンス（200 OK）**

顧客オブジェクトを返します。

---

### 6.3 顧客登録

```
POST /customers
```

> **権限:** 管理者のみ実行可能。

**リクエストボディ**

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `name` | string | ○ | 顧客名（最大100文字） |
| `address` | string | - | 住所（最大255文字） |
| `phone` | string | - | 電話番号（最大20文字） |
| `industry` | string | - | 業種 |

```json
{
  "name": "株式会社D電機",
  "address": "大阪府大阪市北区梅田2-2-2",
  "phone": "06-9876-5432",
  "industry": "電機・電子"
}
```

**レスポンス（201 Created）**

登録した顧客オブジェクトを返します。

---

### 6.4 顧客更新

```
PUT /customers/:id
```

> **権限:** 管理者のみ実行可能。

リクエストボディは [6.3 顧客登録](#63-顧客登録) と同形式。

**レスポンス（200 OK）**

更新後の顧客オブジェクトを返します。

---

### 6.5 顧客削除

```
DELETE /customers/:id
```

> **権限:** 管理者のみ実行可能。論理削除。

**レスポンス（204 No Content）**

---

## 7. 営業マスタ API

### 営業オブジェクト

```json
{
  "id": 1,
  "name": "山田 太郎",
  "email": "yamada@example.com",
  "department": "東京営業部",
  "is_manager": false,
  "created_at": "2026-01-05T09:00:00Z",
  "updated_at": "2026-01-05T09:00:00Z"
}
```

---

### 7.1 営業一覧取得

```
GET /salespersons
```

> **権限:** 管理者のみ実行可能。

**クエリパラメーター**

| パラメーター | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `department` | string | - | 部署で絞り込み（部分一致） |
| `is_manager` | boolean | - | 上長フラグで絞り込み |
| `page` | integer | - | ページ番号 |
| `per_page` | integer | - | 件数 |

**レスポンス（200 OK）**

```json
{
  "data": [
    {
      "id": 1,
      "name": "山田 太郎",
      "email": "yamada@example.com",
      "department": "東京営業部",
      "is_manager": false,
      "created_at": "2026-01-05T09:00:00Z",
      "updated_at": "2026-01-05T09:00:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "per_page": 20,
    "total_pages": 2
  }
}
```

---

### 7.2 営業詳細取得

```
GET /salespersons/:id
```

**レスポンス（200 OK）**

営業オブジェクトを返します（パスワードは含まない）。

---

### 7.3 営業登録

```
POST /salespersons
```

> **権限:** 管理者のみ実行可能。

**リクエストボディ**

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `name` | string | ○ | 氏名（最大50文字） |
| `email` | string | ○ | メールアドレス（最大255文字・重複不可） |
| `password` | string | ○ | 初期パスワード（8文字以上） |
| `department` | string | - | 所属部署（最大100文字） |
| `is_manager` | boolean | - | 上長フラグ（デフォルト: `false`） |

```json
{
  "name": "佐藤 花子",
  "email": "sato@example.com",
  "password": "initialPass1",
  "department": "大阪営業部",
  "is_manager": false
}
```

**レスポンス（201 Created）**

登録した営業オブジェクトを返します（パスワードは含まない）。

**エラーレスポンス**

| ステータス | エラーコード | 説明 |
|----------|------------|------|
| 409 | `DUPLICATE_EMAIL` | メールアドレスがすでに登録済み |
| 422 | `VALIDATION_ERROR` | バリデーションエラー |

---

### 7.4 営業更新

```
PUT /salespersons/:id
```

> **権限:** 管理者のみ実行可能。

**リクエストボディ**

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `name` | string | ○ | 氏名（最大50文字） |
| `email` | string | ○ | メールアドレス（最大255文字） |
| `password` | string | - | 変更する場合のみ指定（8文字以上） |
| `department` | string | - | 所属部署（最大100文字） |
| `is_manager` | boolean | - | 上長フラグ |

**レスポンス（200 OK）**

更新後の営業オブジェクトを返します（パスワードは含まない）。

---

### 7.5 営業削除

```
DELETE /salespersons/:id
```

> **権限:** 管理者のみ実行可能。論理削除。

**レスポンス（204 No Content）**

---

## 8. エラーレスポンス一覧

### エラーレスポンス形式

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容に誤りがあります。",
    "details": [
      {
        "field": "report_date",
        "message": "日付を入力してください。"
      },
      {
        "field": "visit_records[0].visit_content",
        "message": "訪問内容を入力してください。"
      }
    ]
  }
}
```

> `details` はバリデーションエラー（422）の場合のみ付与されます。

### エラーコード一覧

| エラーコード | HTTPステータス | 説明 |
|------------|--------------|------|
| `INVALID_CREDENTIALS` | 401 | 認証情報が不正 |
| `UNAUTHORIZED` | 401 | 未認証（トークンなし・期限切れ） |
| `FORBIDDEN` | 403 | アクセス権限がない |
| `NOT_FOUND` | 404 | リソースが存在しない |
| `DUPLICATE_REPORT` | 409 | 同日付の日報が重複 |
| `DUPLICATE_EMAIL` | 409 | メールアドレスが重複 |
| `LAST_RECORD` | 400 | 最後の訪問記録は削除不可 |
| `VALIDATION_ERROR` | 422 | バリデーションエラー |
| `INTERNAL_SERVER_ERROR` | 500 | サーバー内部エラー |

---

## 付録: エンドポイント一覧

| メソッド | パス | 説明 | 権限 |
|---------|------|------|------|
| POST | `/auth/login` | ログイン | 全員 |
| POST | `/auth/logout` | ログアウト | 全員 |
| POST | `/auth/refresh` | トークンリフレッシュ | 全員 |
| GET | `/reports` | 日報一覧取得 | 全員 |
| GET | `/reports/:id` | 日報詳細取得 | 全員（本人・上長） |
| POST | `/reports` | 日報作成 | 営業 |
| PUT | `/reports/:id` | 日報更新 | 本人（draft時） |
| PATCH | `/reports/:id/status` | ステータス更新 | 上長・管理者 |
| DELETE | `/reports/:id` | 日報削除 | 本人（draft時） |
| POST | `/reports/:report_id/visit_records` | 訪問記録追加 | 本人（draft時） |
| PUT | `/reports/:report_id/visit_records/:id` | 訪問記録更新 | 本人（draft時） |
| DELETE | `/reports/:report_id/visit_records/:id` | 訪問記録削除 | 本人（draft時） |
| POST | `/reports/:report_id/comments` | コメント投稿 | 上長・管理者 |
| PUT | `/reports/:report_id/comments/:id` | コメント更新 | 投稿者本人 |
| DELETE | `/reports/:report_id/comments/:id` | コメント削除 | 投稿者本人 |
| GET | `/customers` | 顧客一覧取得 | 全員 |
| GET | `/customers/:id` | 顧客詳細取得 | 全員 |
| POST | `/customers` | 顧客登録 | 管理者 |
| PUT | `/customers/:id` | 顧客更新 | 管理者 |
| DELETE | `/customers/:id` | 顧客削除 | 管理者 |
| GET | `/salespersons` | 営業一覧取得 | 管理者 |
| GET | `/salespersons/:id` | 営業詳細取得 | 管理者 |
| POST | `/salespersons` | 営業登録 | 管理者 |
| PUT | `/salespersons/:id` | 営業更新 | 管理者 |
| DELETE | `/salespersons/:id` | 営業削除 | 管理者 |

---

*以上*

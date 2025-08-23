# 気象庁カラースケール機能

このフォルダには、気象庁の公式カラースケールを使用して気象データを視覚化するための機能が含まれています。

## 概要

気象データテーブルの数値を気象庁公式の色彩基準に基づいて色付けし、データの読み取りやすさを向上させる機能です。ユーザーはUIコントロールから簡単にカラースケール機能のON/OFFを切り替えることができます。

## ファイル構成

- **`jma_official_colors.ts`** - 気象庁公式カラースケール定義
  - 気温、湿度、風速、降水量、日照時間の公式カラースケール
    - 日照時間 0 のときの配色を `#FFFFFF` に調整済み
  - 露点温度、体積絶対湿度などの派生パラメータ用カラースケール

- **`color_scale_calculator.ts`** - カラースケール計算エンジン
  - 数値から適切な色を計算する機能
  - 線形補間による滑らかな色変化

- **`color_scale_manager.ts`** - カラースケール管理システム
  - テーブル全体のカラースケール適用・削除
  - 背景色に応じた文字色の自動調整（可読性向上）
  - LocalStorageを使用したユーザー設定の永続化

- **`color_scale_ui.ts`** - ユーザーインターフェース
  - 画面右下に配置される切り替えコントロール
  - チェックボックスによるON/OFF操作
  - テーブル存在確認と自動再試行機能

- **`color_scale_global.ts`** - グローバルインスタンス
  - アプリケーション全体で共有するマネージャーインスタンス

- **`*.test.ts`**
  - それぞれの機能に対して存在する

## 主要機能

### 1. 公式カラースケール対応

気象庁ウェブサイトで使用されている公式の色彩基準を忠実に再現：

### 2. 計算値への対応

独自に計算した気象パラメータにも適用：

- **露点温度**: 気温スケールを流用
- **体積絶対湿度**: 湿度スケールを参考に独自調整
- **温度湿度指数**: 快適度に応じた色分け

### 3. 可読性の確保

- 背景色の明度に基づく文字色の自動調整
- WCAG基準に基づくコントラスト比計算
- テキストの縁取り効果による視認性向上

### 4. ユーザビリティ

- ワンクリックでのON/OFF切り替え
- 設定の自動保存・復元
- エラー時の既存機能への影響を最小化

## 使用方法

### 基本的な使用

```typescript
import { globalColorScaleManager } from './color_scale_global'
import { ColorScaleUI } from './color_scale_ui'

// カラースケール機能を初期化
const ui = new ColorScaleUI(globalColorScaleManager)
ui.initialize()

// テーブルにカラースケールを適用
globalColorScaleManager.registerTable(tableElement)
```

### 特定の列への適用

```typescript
// 特定の列のみにカラースケールを適用
globalColorScaleManager.applyColorScaleToColumn(tableElement, 'temp-column')
```

# テーブルカラムの表示・非表示トグル機能設計

このドキュメントでは、JMAアメダス時系列テーブル（`table.amd-table-seriestable`）における特定カラムの表示・非表示を簡単にトグルする機能の設計について説明します。

## テーブル構造の分析

### 対象テーブル
- クラス名: `amd-table-seriestable`
- 構造: ヘッダー行 + データ行の標準的なテーブル構造

### カラム構成とクラス名

分析の結果、各カラムには以下のクラス名が割り当てられています：

| カラム | クラス名 | 表示内容 | 単位 |
|--------|----------|----------|------|
| 気温 | `td-temp` | 気温 | ℃ |
| 降水量 | `td-precipitation1h` | 降水量(前1時間) | mm |
| 風向 | `td-windDirection` | 風向 | 16方位 |
| 風速 | `td-wind` | 風速 | m/s |
| 日照時間 | `td-sun1h` | 日照時間(前1時間) | h |
| 湿度 | `td-humidity` | 湿度 | % |
| 海面気圧 | `td-normalPressure` | 海面気圧 | hPa |

## 実装アプローチ

### 1. CSS display:none アプローチ（推奨）

**特徴:**
- 最も効率的で自然な動作
- カラムが完全に消え、テーブル幅も自動調整
- パフォーマンスが良好

**実装方法:**
```css
.amd-table-seriestable .td-humidity {
  display: none !important;
}
```

### 2. JavaScript DOM操作アプローチ

**特徴:**
- より細かい制御が可能
- アニメーション効果を追加可能
- 復元時の状態管理が複雑

### 3. visibility:hidden アプローチ

**特徴:**
- カラムスペースは保持される
- テーブルレイアウトの崩れが少ない
- 完全非表示ではないため推奨度は低い

## 推奨実装設計

### アーキテクチャ

```
src/jma/column_toggle/
├── column_toggle_main.ts       # メインエントリーポイント
├── column_toggle_ui.ts         # UI制御（チェックボックス等）
├── column_toggle_manager.ts    # カラム表示状態管理
├── column_toggle_storage.ts    # LocalStorage永続化
└── column_definitions.ts       # カラム定義
```

### 機能仕様

1. **UI設計**
   - チェックボックス形式でカラムの表示・非表示を切り替え
   - 設定パネルは既存のカラースケールUIと同様のデザイン
   - 「全て表示」「全て非表示」ボタンも提供

2. **CSS注入方式**
   ```typescript
   // カラム非表示CSS生成例
   private generateHideColumnCSS(columnClass: string): string {
     return `.amd-table-seriestable .${columnClass} { display: none !important; }`
   }
   ```

3. **設定永続化**
   - LocalStorageキー: `jma_column_visibility_settings`
   - JSON形式で各カラムの表示状態を保存
   ```json
   {
     "td-temp": true,
     "td-humidity": false,
     "td-windDirection": true,
     // ...
   }
   ```

4. **動的CSS管理**
   ```typescript
   class ColumnToggleManager {
     private styleElement: HTMLStyleElement
     
     updateColumnVisibility(columnClass: string, visible: boolean): void {
       // CSSルールの動的更新
     }
   }
   ```

### カラム定義

```typescript
export interface ColumnDefinition {
  className: string
  displayName: string
  description: string
  defaultVisible: boolean
  priority: number // 重要度
}

export const COLUMN_DEFINITIONS: ColumnDefinition[] = [
  {
    className: 'td-temp',
    displayName: '気温',
    description: '気温(℃)',
    defaultVisible: true,
    priority: 1
  },
  {
    className: 'td-humidity',
    displayName: '湿度',
    description: '相対湿度(%)',
    defaultVisible: true,
    priority: 2
  },
  // ...
]
```

## 既存アーキテクチャとの統合

### 1. カラースケールとの共存
- カラースケール機能と連携し、非表示カラムには着色を適用しない
- `color_scale_manager.ts`でカラム表示状態をチェック

### 2. モジュラー設計
- 既存の`seriestable/`モジュールから独立した新機能として実装
- 必要に応じて`areastable/`にも適用可能

### 3. 設定UI統合
- 既存のカラースケール設定UIと同じ場所にタブとして追加
- 一貫したユーザーエクスペリエンスを提供

## 実装上の考慮事項

### セキュリティ
- CSS注入時のサニタイゼーション
- LocalStorage使用時のデータ検証

### パフォーマンス
- CSS注入は1回のstyleElement更新で複数カラムを処理
- DOM監視は必要最小限に留める

### ユーザビリティ
- デフォルト状態では全カラム表示
- 重要なカラム（気温等）は誤って非表示にできないよう保護
- 設定リセット機能の提供

### ブラウザ互換性
- 主要ブラウザでのCSS `display:none` サポートは問題なし
- IE11サポートが必要な場合の代替手段も検討済み

## 実装の優先度

1. **Phase 1**: 基本的なカラム非表示機能
   - CSS注入によるdisplay:none実装
   - 簡易的なチェックボックスUI

2. **Phase 2**: 高度なUI機能
   - 設定の永続化
   - 全表示/全非表示ボタン
   - カラムの重要度に基づく保護機能

3. **Phase 3**: 統合機能
   - カラースケールとの連携
   - areastableへの適用
   - アニメーション効果の追加

この設計により、ユーザーは直感的にテーブルカラムの表示をカスタマイズでき、必要な情報のみに集中して気象データを確認できるようになります。
# テーブルカラムの表示・非表示トグル機能設計

このドキュメントでは、JMAアメダス時系列テーブル（`table.amd-table-seriestable`）における特定カラムの表示・非表示を簡単にトグルする機能の設計について説明します。

## JMAサイト構造の分析結果

### 対象テーブル
- クラス名: `amd-table-seriestable`
- 構造: ヘッダー行 + データ行の標準的なテーブル構造
- **重要**: JMAの観測要素選択システムによる動的テーブル生成機能が存在

### 観測要素選択システムの発見

JMAサイトの詳細調査により、以下の重要な仕組みが判明しました：

1. **観測要素選択UI** (`amd-selector-div-block-items`)
   - 青色ボタン: 選択済み項目（テーブルに表示される）
   - 白色ボタン: 未選択項目（テーブルに表示されない）
   - 動的制御: 選択状態に応じてテーブルカラムが動的に生成される

2. **カラム分類**
   - **JMA標準カラム**: 観測要素選択UIで制御される（気温、降水量、風向等）
   - **拡張カラム**: 独自に追加されたカラム（容積絶対湿度、露点温度、不快指数）

### カラム構成とクラス名

#### JMA標準カラム（観測要素選択UI制御）
| カラム | 観測要素ID | 表示内容 | 単位 | 制御方法 |
|--------|------------|----------|------|----------|
| 気温 | `temp` | 気温 | ℃ | 観測要素選択UI |
| 降水量(前10分間) | `precipitation10m` | 降水量(前10分間) | mm | 観測要素選択UI |
| 降水量(前1時間) | `precipitation1h` | 降水量(前1時間) | mm | 観測要素選択UI |
| 降水量(前3時間) | `precipitation3h` | 降水量(前3時間) | mm | 観測要素選択UI |
| 降水量(前24時間) | `precipitation24h` | 降水量(前24時間) | mm | 観測要素選択UI |
| 風向 | `windDirection` | 風向 | 16方位 | 観測要素選択UI |
| 風速 | `wind` | 風速 | m/s | 観測要素選択UI |
| 日照時間(推計)(前10分間) | `sun10m` | 日照時間(推計)(前10分間) | h | 観測要素選択UI |
| 日照時間(推計)(前1時間) | `sun1h` | 日照時間(推計)(前1時間) | h | 観測要素選択UI |
| 湿度 | `humidity` | 湿度 | % | 観測要素選択UI |

#### 拡張カラム（CSS制御）
| カラム | クラス名 | 表示内容 | 単位 | 制御方法 |
|--------|----------|----------|------|----------|
| 容積絶対湿度 | `enhanced-absolute-humidity` | 容積絶対湿度 | g/㎥ | CSS display制御 |
| 露点温度 | `enhanced-dew-point` | 露点温度 | ℃ | CSS display制御 |
| 不快指数 | `enhanced-discomfort-index` | 不快指数 | - | CSS display制御 |

## ハイブリッド実装アプローチ

### 1. JMA標準カラム制御（観測要素選択UI連携）

**特徴:**
- JMAの既存システムを活用
- 完全なテーブル再生成によるネイティブ動作
- データ取得からカラム表示まで一貫した処理

**実装方法:**
```typescript
class JMAElementController {
  toggleElement(elementId: string, visible: boolean): void {
    const selector = `.amd-selector-div-block-items [data-element="${elementId}"]`;
    const button = document.querySelector(selector) as HTMLElement;
    
    if (button && this.isSelected(button) !== visible) {
      button.click(); // JMAの既存動作を活用
    }
  }

  private isSelected(button: HTMLElement): boolean {
    return button.classList.contains('selected') || 
           button.style.backgroundColor === 'blue';
  }
}
```

### 2. 拡張カラム制御（CSS display方式）

**特徴:**
- 既存の拡張機能との互換性
- 軽量で高速な表示制御
- 独立したカラム管理

**実装方法:**
```typescript
class ExtendedColumnController {
  toggleColumn(columnClass: string, visible: boolean): void {
    const css = `.amd-table-seriestable .${columnClass} { 
      display: ${visible ? 'table-cell' : 'none'} !important; 
    }`;
    this.injectCSS(css);
  }

  private injectCSS(css: string): void {
    if (!this.styleElement) {
      this.styleElement = document.createElement('style');
      document.head.appendChild(this.styleElement);
    }
    this.styleElement.textContent = css;
  }
}
```

## 統合実装設計

### アーキテクチャ

```
src/jma/column_toggle/
├── column_toggle_main.ts          # 統合エントリーポイント
├── jma_element_controller.ts      # JMA標準カラム制御
├── extended_column_controller.ts  # 拡張カラム制御
├── column_toggle_manager.ts       # 統合管理クラス
├── column_toggle_ui.ts            # ユーザーインターフェース
├── column_toggle_storage.ts       # LocalStorage永続化
└── column_definitions.ts          # カラム定義
```

### 統合管理クラス

```typescript
class ColumnToggleManager {
  private jmaController = new JMAElementController();
  private extendedController = new ExtendedColumnController();
  private storage = new ColumnToggleStorage();

  toggleColumn(columnId: string, visible: boolean): void {
    const columnDef = this.getColumnDefinition(columnId);
    
    if (columnDef.type === 'jma-standard') {
      this.jmaController.toggleElement(columnDef.elementId, visible);
    } else if (columnDef.type === 'extended') {
      this.extendedController.toggleColumn(columnDef.className, visible);
    }
    
    this.storage.saveColumnState(columnId, visible);
  }

  private getColumnDefinition(columnId: string): ColumnDefinition {
    return COLUMN_DEFINITIONS.find(def => def.id === columnId);
  }
}
```

### カラム定義

```typescript
export interface ColumnDefinition {
  id: string
  type: 'jma-standard' | 'extended'
  displayName: string
  description: string
  elementId?: string      // JMA標準カラム用
  className?: string      // 拡張カラム用
  defaultVisible: boolean
  priority: number
  category: 'basic' | 'precipitation' | 'wind' | 'solar' | 'humidity' | 'enhanced'
}

export const COLUMN_DEFINITIONS: ColumnDefinition[] = [
  // JMA標準カラム
  {
    id: 'temp',
    type: 'jma-standard',
    displayName: '気温',
    description: '気温(℃)',
    elementId: 'temp',
    defaultVisible: true,
    priority: 1,
    category: 'basic'
  },
  {
    id: 'precipitation10m',
    type: 'jma-standard',
    displayName: '降水量(前10分間)',
    description: '降水量(前10分間)(mm)',
    elementId: 'precipitation10m',
    defaultVisible: false,
    priority: 3,
    category: 'precipitation'
  },
  {
    id: 'precipitation1h',
    type: 'jma-standard',
    displayName: '降水量(前1時間)',
    description: '降水量(前1時間)(mm)',
    elementId: 'precipitation1h',
    defaultVisible: true,
    priority: 2,
    category: 'precipitation'
  },
  {
    id: 'humidity',
    type: 'jma-standard',
    displayName: '湿度',
    description: '相対湿度(%)',
    elementId: 'humidity',
    defaultVisible: true,
    priority: 2,
    category: 'humidity'
  },
  
  // 拡張カラム
  {
    id: 'absolute-humidity',
    type: 'extended',
    displayName: '容積絶対湿度',
    description: '容積絶対湿度(g/㎥)',
    className: 'enhanced-absolute-humidity',
    defaultVisible: true,
    priority: 4,
    category: 'enhanced'
  },
  {
    id: 'dew-point',
    type: 'extended',
    displayName: '露点温度',
    description: '露点温度(℃)',
    className: 'enhanced-dew-point',
    defaultVisible: true,
    priority: 4,
    category: 'enhanced'
  },
  {
    id: 'discomfort-index',
    type: 'extended',
    displayName: '不快指数',
    description: '不快指数',
    className: 'enhanced-discomfort-index',
    defaultVisible: true,
    priority: 5,
    category: 'enhanced'
  }
];
```

### UI設計

```typescript
class ColumnToggleUI {
  createControlPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'column-toggle-panel';
    
    // カテゴリ別タブ
    const tabs = this.createCategoryTabs();
    panel.appendChild(tabs);
    
    // カラムチェックボックス
    const checkboxContainer = this.createCheckboxContainer();
    panel.appendChild(checkboxContainer);
    
    // 制御ボタン
    const controlButtons = this.createControlButtons();
    panel.appendChild(controlButtons);
    
    return panel;
  }

  private createControlButtons(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'column-toggle-controls';
    
    // 全て表示
    const showAllBtn = document.createElement('button');
    showAllBtn.textContent = '全て表示';
    showAllBtn.onclick = () => this.toggleAllColumns(true);
    
    // 全て非表示
    const hideAllBtn = document.createElement('button');
    hideAllBtn.textContent = '全て非表示';
    hideAllBtn.onclick = () => this.toggleAllColumns(false);
    
    // 初期設定に戻す
    const resetBtn = document.createElement('button');
    resetBtn.textContent = '初期設定に戻す';
    resetBtn.onclick = () => this.resetToDefaults();
    
    container.append(showAllBtn, hideAllBtn, resetBtn);
    return container;
  }
}
```

## 設定永続化

```typescript
class ColumnToggleStorage {
  private readonly STORAGE_KEY = 'jma_column_visibility_settings';

  saveColumnState(columnId: string, visible: boolean): void {
    const settings = this.loadSettings();
    settings[columnId] = visible;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
  }

  loadSettings(): Record<string, boolean> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.warn('Failed to load column settings:', error);
      return {};
    }
  }

  resetToDefaults(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
```

## 既存アーキテクチャとの統合

### 1. カラースケールとの連携
```typescript
// カラースケール適用時に表示状態をチェック
class ColorScaleManager {
  applyColorScale(column: string, value: number): void {
    const isVisible = this.columnToggleManager.isColumnVisible(column);
    if (!isVisible) return; // 非表示カラムには着色しない
    
    // 既存の着色ロジック
    this.applyColor(column, value);
  }
}
```

### 2. モジュール統合
- `seriestable_main.ts`からの初期化
- 既存の拡張機能との共存
- `areastable/`への適用可能性を考慮

### 3. 設定UI統合
- カラースケール設定と同じ場所に「カラム表示」タブを追加
- 一貫したデザインとユーザーエクスペリエンス

## 実装上の考慮事項

### セキュリティ
- CSS注入時のサニタイゼーション
- LocalStorage使用時のデータ検証
- JMA要素ID/クラス名のvalidation

### パフォーマンス
- JMA標準カラムの変更は最小限に
- CSS注入は1回のstyleElement更新で複数カラムを処理
- DOM監視は必要最小限に留める

### ユーザビリティ
- デフォルト状態では重要カラムのみ表示
- 重要なカラム（気温等）は誤って非表示にできないよう保護
- カテゴリ別の一括制御機能
- 設定リセット機能の提供

### ブラウザ互換性
- 主要ブラウザでの動作確認
- JMAサイトの構造変更への対応

## 実装の優先度

### Phase 1: 基本機能 🎯
- [ ] `column_definitions.ts` - カラム定義とタイプ分類
- [ ] `jma_element_controller.ts` - 観測要素選択UI連携
- [ ] `extended_column_controller.ts` - CSS display制御
- [ ] `column_toggle_manager.ts` - 両方式の統合管理
- [ ] `column_toggle_ui.ts` - 基本チェックボックスUI
- [ ] `column_toggle_main.ts` - エントリーポイントと初期化

### Phase 2: 高度なUI機能 🚀
- [ ] `column_toggle_storage.ts` - LocalStorage永続化
- [ ] カテゴリ別タブ表示機能
- [ ] 全表示/全非表示/リセットボタン
- [ ] 重要カラムの保護機能

### Phase 3: 統合・最適化 ⭐
- [ ] カラースケール機能との連携
- [ ] areastableモジュールへの適用
- [ ] UI/UXの改善（アニメーション等）
- [ ] パフォーマンス最適化

### 技術的考慮事項
- JMA標準カラムは`amd-selector-div-block-items`のボタンクリックで制御
- 拡張カラムは`display: none/table-cell`のCSS注入で制御
- 既存のcolor_scaleモジュールパターンを踏襲
- seriestable_main.tsから初期化する構成

この設計により、JMA標準システムと拡張機能の両方を統合した、完全なカラム表示・非表示制御機能を実現できます。ユーザーは直感的にテーブルカラムの表示をカスタマイズでき、必要な情報のみに集中して気象データを確認できるようになります。

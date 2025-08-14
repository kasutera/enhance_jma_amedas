# Chrome Debugger用 カラムToggle CSS

## 基本的なカラム非表示CSS

Chrome Debuggerのコンソールで以下のCSSを実行して、カラム非表示の動作を確認できます。

## 問題：th部分が非表示にならない

単純な `.td-humidity { display: none !important; }` ではヘッダー行（th要素）とデータ行（td要素）の両方を非表示にできない問題があります。

## 解決方法

### 1. nth-child セレクタを使用（推奨）

```css
/* 湿度カラム（7列目）をヘッダーとデータ両方で非表示 */
.amd-table-seriestable th:nth-child(7),
.amd-table-seriestable td:nth-child(7) { 
  display: none !important; 
}
```

### 2. 動的カラム位置検出アプローチ（推奨）

列数が動的に変化する場合に対応するため、JavaScriptでカラムの実際の位置を検出してからCSSを適用します。

```javascript
// カラム位置を動的に検出してテスト
function testColumnDetection() {
  const columns = ['td-temp', 'td-humidity', 'td-normalPressure'];
  
  columns.forEach(columnClass => {
    const position = getColumnPosition(columnClass);
    console.log(`${columnClass}: position ${position}`);
  });
}

// 実行
testColumnDetection();
```

### 3. より堅牢なカラム検出

複数のデータ行をチェックして確実性を高める方法：

```javascript
// より堅牢なカラム位置検出
function getColumnPositionRobust(columnClass) {
  const table = document.querySelector('.amd-table-seriestable');
  if (!table) return null;
  
  // 複数のデータ行をチェック
  const dataRows = table.querySelectorAll('tr:not(.simple-table-hidden-tr):not(.contents-header)');
  
  for (let row of dataRows) {
    const cells = Array.from(row.children);
    const targetIndex = cells.findIndex(cell => cell.classList.contains(columnClass));
    
    if (targetIndex !== -1) {
      console.log(`Found ${columnClass} at position ${targetIndex + 1} in row`);
      return targetIndex + 1;
    }
  }
  
  console.error(`Column class ${columnClass} not found in any data row`);
  return null;
}
```

### 2. 複数カラムを非表示にする

```css
/* 湿度と海面気圧カラムを非表示 */
.amd-table-seriestable .td-humidity,
.amd-table-seriestable .td-normalPressure { 
  display: none !important; 
}
```

### 3. 気象要素別の非表示パターン

```css
/* 風関連カラムを非表示（風向・風速） */
.amd-table-seriestable .td-windDirection,
.amd-table-seriestable .td-wind { 
  display: none !important; 
}
```

```css
/* 降水・日照カラムを非表示 */
.amd-table-seriestable .td-precipitation1h,
.amd-table-seriestable .td-sun1h { 
  display: none !important; 
}
```

## Debugger用 JavaScript コマンド

### CSSを動的に追加/削除する関数

```javascript
// カラム位置を動的に検出する関数
function getColumnPosition(columnClass) {
  const table = document.querySelector('.amd-table-seriestable');
  if (!table) {
    console.error('Series table not found');
    return null;
  }
  
  // データ行からtd要素でカラム位置を検出
  const dataRow = table.querySelector('tr:not(.simple-table-hidden-tr):not(.contents-header)');
  if (!dataRow) {
    console.error('Data row not found');
    return null;
  }
  
  const cells = Array.from(dataRow.children);
  const targetIndex = cells.findIndex(cell => cell.classList.contains(columnClass));
  
  if (targetIndex === -1) {
    console.error(`Column class ${columnClass} not found`);
    return null;
  }
  
  // nth-child は1ベースなので+1
  return targetIndex + 1;
}

// カラム非表示CSS追加（動的検出版）
function hideColumn(columnClass) {
  const styleId = `hide-${columnClass}`;
  if (document.getElementById(styleId)) return; // 既に存在する場合は何もしない
  
  const position = getColumnPosition(columnClass);
  if (!position) {
    return;
  }
  
  const style = document.createElement('style');
  style.id = styleId;
  // th（ヘッダー）とtd（データ）の両方を非表示にする
  style.textContent = `
    .amd-table-seriestable th:nth-child(${position}),
    .amd-table-seriestable td:nth-child(${position}) { 
      display: none !important; 
    }
  `;
  document.head.appendChild(style);
  console.log(`Column ${columnClass} (position ${position}) hidden`);
}

// カラム表示CSS削除
function showColumn(columnClass) {
  const styleId = `hide-${columnClass}`;
  const style = document.getElementById(styleId);
  if (style) {
    style.remove();
    console.log(`Column ${columnClass} shown`);
  }
}

// カラムトグル
function toggleColumn(columnClass) {
  const styleId = `hide-${columnClass}`;
  if (document.getElementById(styleId)) {
    showColumn(columnClass);
  } else {
    hideColumn(columnClass);
  }
}
```

## 実際の動作確認手順

### 1. JMA Amedasページを開く

1. https://www.jma.go.jp/bosai/amedas/ にアクセス
2. 任意の地点をクリックして時系列表示に移動
3. Chrome DevToolsを開く（F12）

### 2. コンソールでテスト実行

```javascript
// 上記の関数をコンソールに貼り付け実行後、以下のコマンドでテスト

// 湿度カラムを非表示
hideColumn('td-humidity');

// 湿度カラムを再表示
showColumn('td-humidity');

// 湿度カラムをトグル
toggleColumn('td-humidity');

// 複数カラムを一度に非表示
hideColumn('td-humidity');
hideColumn('td-normalPressure');
hideColumn('td-sun1h');

// 全て再表示
showColumn('td-humidity');
showColumn('td-normalPressure');
showColumn('td-sun1h');
```

### 3. 利用可能なカラムクラス一覧

```javascript
// 全カラムクラス
const availableColumns = [
  'td-temp',           // 気温
  'td-precipitation1h', // 降水量
  'td-windDirection',  // 風向
  'td-wind',          // 風速
  'td-sun1h',         // 日照時間
  'td-humidity',      // 湿度
  'td-normalPressure' // 海面気圧
];

// 各カラムの存在確認
availableColumns.forEach(col => {
  const elements = document.querySelectorAll(`.amd-table-seriestable .${col}`);
  console.log(`${col}: ${elements.length} elements found`);
});
```

## 高度なテスト用CSS

### アニメーション付きトグル

```css
/* アニメーション付きカラム非表示 */
.amd-table-seriestable .td-humidity { 
  opacity: 0 !important; 
  transform: scaleX(0) !important;
  transition: all 0.3s ease !important;
  transform-origin: left !important;
}
```

### 背景色での視覚的確認

```css
/* 非表示対象カラムを赤背景で強調表示（テスト用） */
.amd-table-seriestable .td-humidity { 
  background-color: rgba(255, 0, 0, 0.3) !important;
  border: 2px solid red !important;
}
```

## 期待される動作

1. **カラム完全消失**: 指定したカラムが完全に見えなくなる
2. **テーブル幅調整**: 残りのカラムがテーブル幅に合わせて自動調整される
3. **スクロール動作**: 横スクロールが必要な場合は適切に動作する
4. **レスポンシブ対応**: 画面幅変更時も正しく表示される

## トラブルシューティング

```javascript
// テーブル存在確認
const tables = document.querySelectorAll('.amd-table-seriestable');
console.log(`Found ${tables.length} series tables`);

// 特定カラムの存在確認
const humidityColumns = document.querySelectorAll('.amd-table-seriestable .td-humidity');
console.log(`Found ${humidityColumns.length} humidity columns`);

// 適用されているCSSルール確認
const sampleCell = document.querySelector('.amd-table-seriestable .td-humidity');
if (sampleCell) {
  console.log('Computed style:', window.getComputedStyle(sampleCell).display);
}
```

このCSSとJavaScriptコードを使用して、実際のJMA Amedasページでカラムの表示・非表示機能をテストし、期待通りの動作を確認できます。

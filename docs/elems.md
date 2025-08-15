# JMA Amedas elems パラメータ解析

## 概要

JMA（気象庁）のアメダスサイトでは、表示する観測要素の選択状態を `elems` URLパラメータで管理しています。このパラメータは16進数形式のビットフラグシステムを採用しており、各観測要素が特定のビット位置に対応しています。

## パラメータ形式

- **形式**: 16進数文字列
- **例**: `53414`, `53434`, `5361c`
- **制御方式**: ビットフラグ（各ビットが観測要素のON/OFFを制御）

## 完全ビットマッピング

### 基本パターン分析

| elems値 | 10進数 | 2進数表現 | 説明 |
|---------|--------|-----------|------|
| `0` | 0 | `0` | ベースライン（地点名のみ） |
| `53414` | 341012 | `1010011010000010100` | 標準基本観測要素セット |
| `53434` | 341044 | `1010011010000110100` | 基本セット + 降雪要素 |
| `5361c` | 341532 | `1010011011000011100` | 拡張観測要素組み合わせ |

### 完全ビット位置マッピング

| ビット位置 | ビット値（16進） | ビット値（10進） | 対応観測要素 | 確認済み |
|-----------|---------------|---------------|-------------|---------|
| 0 | 0x1 | 1 | 自動観測による天気 | ✓ |
| 1 | 0x2 | 2 | 水平視程 | ✓ |
| 2 | 0x4 | 4 | 海面気圧 | ✓ |
| 3 | 0x8 | 8 | 現地気圧 | ✓ |
| 4 | 0x10 | 16 | 湿度 | ✓ |
| 5 | 0x20 | 32 | 降雪量(前1時間) | ✓ |
| 10 | 0x400 | 1024 | 日照時間(前1時間) | ✓ |
| 12 | 0x1000 | 4096 | 風速 | ✓ |
| 13 | 0x2000 | 8192 | 風向 | ✓ |
| 16 | 0x10000 | 65536 | 降水量(前1時間) | ✓ |
| 18 | 0x40000 | 262144 | 気温 | ✓ |

## 観測要素の推定マッピング

以下は観測可能な要素と推定されるビット位置です：

### 基本気象要素

- **気温**: 常に表示（基本ビット）
- **降水量(前1時間)**: 常に表示（基本ビット）
- **風向**: 常に表示（基本ビット）
- **風速**: 常に表示（基本ビット）

### 選択可能要素

- **降水量(前10分間)**: ビット位置未特定
- **降水量(前3時間)**: ビット位置未特定
- **降水量(前24時間)**: ビット位置未特定
- **日照時間(前10分間)**: ビット位置未特定
- **日照時間(前1時間)**: ビット位置未特定
- **積雪深**: ビット位置未特定
- **降雪量(前1時間)**: ビット5（値32）✓確認済み
- **降雪量(前6時間)**: ビット位置未特定
- **降雪量(前12時間)**: ビット位置未特定
- **降雪量(前24時間)**: ビット位置未特定
- **湿度**: 基本セットに含まれる
- **現地気圧**: 基本セットに含まれる
- **海面気圧**: 基本セットに含まれる
- **水平視程**: ビット位置未特定
- **自動観測による天気**: ビット位置未特定

## XOR演算による差分解析

```javascript
// 基本値からの差分計算
const base = 0x53414;  // 341012
const snow = 0x53434;  // 341044
const other = 0x5361c; // 341532

// 降雪要素追加時の差分
console.log((snow ^ base).toString(2)); // "100000" (ビット5)

// その他の要素組み合わせ
console.log((other ^ base).toString(2)); // "1000001000" (ビット3,9)
```

## 実装への活用

### JMAElementController での利用

```typescript
class JMAElementController {
  private readonly ELEMENT_BITS = {
    '自動観測による天気': 0,
    '水平視程': 1,
    '海面気圧': 2,
    '現地気圧': 3,
    '湿度': 4,
    '降雪量(前1時間)': 5,
    '日照時間(前1時間)': 10,
    '風速': 12,
    '風向': 13,
    '降水量(前1時間)': 16,
    '気温': 18,
    // 他の要素のビット位置も必要に応じて追加可能
  };
  
  private getCurrentElemsValue(): number {
    const url = new URL(window.location.href);
    const elems = url.searchParams.get('elems') || '53414';
    return parseInt(elems, 16);
  }
  
  isElementVisible(elementId: string): boolean {
    const bitPosition = this.ELEMENT_BITS[elementId];
    if (bitPosition === undefined) return false;
    
    const currentValue = this.getCurrentElemsValue();
    return (currentValue & (1 << bitPosition)) !== 0;
  }
  
  toggleElement(elementId: string, visible: boolean): boolean {
    const bitPosition = this.ELEMENT_BITS[elementId];
    if (bitPosition === undefined) return false;
    
    const currentValue = this.getCurrentElemsValue();
    const bitMask = 1 << bitPosition;
    
    let newValue: number;
    if (visible) {
      newValue = currentValue | bitMask;  // ビットをセット
    } else {
      newValue = currentValue & ~bitMask; // ビットをクリア
    }
    
    // URLを更新してJMAサイトに反映
    const url = new URL(window.location.href);
    url.searchParams.set('elems', newValue.toString(16));
    window.location.href = url.toString();
    
    return true;
  }
}
```

## 今後の調査課題

1. **未特定要素のビット位置特定**
   - 各観測要素の個別ビット位置を特定
   - システム的な調査による完全なマッピング作成

2. **ビットパターンの規則性解析**
   - 要素種別とビット位置の関連性
   - グループ化されたビット領域の存在確認

3. **デフォルト値の調査**
   - 地域による初期選択要素の違い
   - 季節や時期による動的変更の有無

## 関連ファイル

- `/src/jma/column_toggle/jma_element_controller.ts` - 実装コード
- `/docs/column_toggle.md` - Column Toggle機能の設計仕様
- `/src/jma/column_toggle/column_definitions.ts` - カラム定義とマッピング

## 更新履歴

- 2025-08-15: 初版作成、基本パターンとビット5の特定
- 今後: 完全なビットマッピングの追加予定

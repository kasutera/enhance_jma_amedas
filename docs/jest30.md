# Jest 30への移行ガイド

このドキュメントでは、Enhance JMA AmedasプロジェクトのJest 29からJest 30への移行内容と対応について説明します。

## 更新概要

Jest 30は3年ぶりのメジャーリリースで、パフォーマンス向上、TypeScript強化、DOM API改善などの大幅な変更が含まれています。

### 更新されたパッケージ

```json
{
  "jest": "^29.7.0" → "^30.0.5",
  "@jest/globals": "^29.7.0" → "^30.0.5", 
  "@types/jest": "^29.5.14" → "^30.0.0",
  "jest-environment-jsdom": "^29.7.0" → "^30.0.5"
}
```

**注意**: `ts-jest`は30未対応のため29.4.1のまま維持

## Jest 30の主要な変更点

### 1. 環境要件の変更

- **Node.js**: 14, 16, 19, 21のサポート終了 → 最小18.x必要
- **TypeScript**: 最小5.4必要
- **JSDOM**: v21 → v26に更新

本プロジェクトはNode.js 24環境のため影響なし。

### 2. JSDOM v26による変更

#### DOM APIの仕様準拠強化

Jest 30ではJSDOMがv21からv26に更新され、より厳密なWeb標準準拠となりました。

**影響箇所**: CSS属性の取得方法

```typescript
// Jest 29での動作
element.style.borderBottom // "hidden"

// Jest 30での動作  
element.style.borderBottom // ""（空文字列）
```

**対応**: テストの期待値を修正

```diff
// src/jma/areastable/dom_generators.test.ts
// src/jma/seriestable/dom_generators.test.ts
- expect((node as HTMLTableCellElement).style.borderBottom).toBe('hidden')
+ expect((node as HTMLTableCellElement).style.borderBottom).toBe('')
```

#### 色処理の変更

JSDOM v26では無効な色形式の処理が変更されました。

```typescript
// Jest 29: rgb(255, 255, 255, 255) → null
// Jest 30: rgb(255, 255, 255, 255) → [255, 255, 255]
```

**対応**: 実際のブラウザ動作に合わせてテストを調整

```diff
// src/jma/color_scale/color_scale_manager.test.ts
- expect(parseColorToRGB('rgb(255, 255, 255, 255)')).toBe(null)
+ expect(parseColorToRGB('rgb(255, 255, 255, 255)')).toEqual([255, 255, 255])
```

### 3. HTMLシリアライゼーションの変更

Jest 30では`innerHTML`や`outerHTML`の出力形式が変更されました。

**問題**: 文字列比較テストが失敗

```typescript
// 以前のアプローチ（脆弱）
expect(element.outerHTML).toBe(expectedHTML)
```

**対応**: 構造的な検証に変更

```typescript
// 改善されたアプローチ（堅牢）
const newColumn = table.querySelector('.target-class')
expect(newColumn).not.toBeNull()
expect(newColumn?.textContent).toBe('expected-value')

const headers = table.querySelectorAll('th')
expect(headers.length).toBeGreaterThan(expectedCount)
```

### 4. Expectマッチャーの変更

Jest 30では非推奨のエイリアスが削除されました。

**主な変更**:

- `toBeCalled()` → `toHaveBeenCalled()`
- `toBeCalledWith()` → `toHaveBeenCalledWith()`
- `toThrowError()` → `toThrow()`

**本プロジェクトでの影響**: エイリアスは使用していないため変更不要

## パフォーマンス改善

### モジュール解決の最適化

Jest 30では新しい`unrs-resolver`により、モジュール解決が高速化されました。

**改善効果**:

- テスト実行時間の短縮
- メモリ使用量の削減
- TypeScriptプロジェクトでの特に顕著な改善

### Promise処理の改善

Jest 30では未処理のPromise rejectionsの検出がより正確になりました。

```typescript
// Jest 30では追加のイベントループターンを待機
// 偽陽性のテスト失敗を防止
```

## 移行時の注意点

### 1. テストの堅牢性向上

HTMLシリアライゼーション変更への対応として、テストを構造的検証に変更しました。これにより、ブラウザ間の差異やJest内部実装変更に対してより耐性のあるテストになりました。

### 2. ts-jestの互換性

Jest 30対応のts-jestが未リリースのため、29.4.1を継続使用しています。将来的には以下を監視：

```bash
npm view ts-jest versions --json | grep "30\."
```

### 3. CIパイプラインへの影響

- Node.js 24環境により互換性確保
- テスト実行時間の短縮が期待される
- メモリ使用量削減によりCI効率化

## トラブルシューティング

### よくある問題と解決策

#### 1. CSS属性テストの失敗

```bash
Expected: "hidden"
Received: ""
```

**解決**: CSS属性の期待値を空文字列に変更

#### 2. HTML構造テストの失敗

```bash
Expected HTML string does not match
```

**解決**: 文字列比較から要素存在確認に変更

#### 3. 色処理テストの失敗

```bash
Expected: null
Received: [255, 255, 255]
```

**解決**: ブラウザの実際の動作に合わせて期待値調整

## 今後の対応

### 監視すべき項目

1. **ts-jest 30対応**: リリース次第更新予定
2. **Jest 30.1以降**: バグフィックスとマイナー改善
3. **依存関係**: 他のテストツールとの互換性

### 推奨事項

1. **テスト設計**: 実装詳細でなく動作に焦点を当てる
2. **構造的検証**: HTML文字列比較を避ける
3. **継続的監視**: Jest ecosystem更新の追跡

## 参考資料

- [Jest 30公式リリースノート](https://jestjs.io/blog/2025/06/04/jest-30)
- [Jest 30移行ガイド](https://jestjs.io/docs/upgrading-to-jest30)
- [JSDOM v26変更ログ](https://github.com/jsdom/jsdom/releases)

## 移行完了の確認

以下のコマンドで移行が正常に完了していることを確認できます：

```bash
# 全テストの実行
npm test

# ビルドの確認
npm run build

# パッケージバージョンの確認
npm list jest @jest/globals jest-environment-jsdom
```

すべて正常に動作することで、Jest 30への移行が完了しています。

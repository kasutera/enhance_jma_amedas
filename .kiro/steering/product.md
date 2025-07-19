---
inclusion: always
---

# Product Overview

Enhance JMA Amedas is a userscript that enhances the Japan Meteorological Agency (JMA) Amedas weather data website by adding calculated meteorological values like volumetric absolute humidity and dew point temperature.

## Critical Design Constraints

- **カラースケール配色**: 気象庁公式の色を使用すること。勝手に変更してはならない
- **Target Website**: JMA Amedas website (`www.jma.go.jp/bosai/amedas/`) のみ対応
- **Userscript Compatibility**: Tampermonkey/Violentmonkey環境での動作を保証すること
- **Language**: ユーザー向けドキュメントは日本語で記述すること

## Core Features

- **気象計算機能**: 体積絶対湿度と露点温度の自動計算・表示
- **テーブル拡張**: 既存のJMAテーブルに新しい列を動的に追加
- **カラースケール機能**: 気象庁公式配色による数値の視覚化
- **双方向対応**: エリアテーブルと時系列テーブルの両方をサポート
- **リアルタイム処理**: ページ読み込み時とデータ更新時の自動処理

## Architecture Principles

- **モジュラー設計**: `areastable/`、`seriestable/`、`color_scale/`で機能を分離
- **DOM操作の最小化**: 既存のJMAサイト構造を尊重し、必要最小限の変更のみ
- **エラーハンドリング**: JMAサイトの構造変更に対する堅牢性を確保
- **パフォーマンス**: 大量の気象データ処理時の応答性を維持
- **状態管理**: LocalStorageを使用したユーザー設定の永続化

## Development Guidelines

- **気象計算の精度**: 科学的に正確な計算式を使用すること
- **UI一貫性**: JMAサイトの既存デザインと調和すること
- **テスト要件**: 気象計算ロジックには必ず単体テストを含めること
- **ブラウザ互換性**: 主要ブラウザでの動作を確認すること

## Color Scale Implementation

- **ColorScaleCalculator**: 気象庁公式カラースケールによる色計算エンジン
- **ColorScaleManager**: テーブル全体のカラースケール適用・管理
- **ColorScaleUI**: ユーザー向けON/OFF切り替えインターフェース
- **公式配色の厳守**: `jma_official_colors.ts`で定義された配色のみ使用
- **動的適用**: 既存テーブルへの非破壊的なスタイル適用
- **設定永続化**: LocalStorageによるユーザー設定の保存・復元

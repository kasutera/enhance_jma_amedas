/** アプリケーションが所有する機能の更新・解除。解除後の非同期処理はDOMを変更しない。 */
export interface Feature {
  refresh(): void
  dispose(): void
}

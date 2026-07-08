# ユメモール 〜理想のショッピングモール経営記〜

3フロアの大型ショッピングモールを一人称で歩き回りながら、テナントを誘致し賃料を集め、直営店を繁盛させて日本一のモールを目指す経営シミュレーション（Three.jsによる3D表示、依存ビルドツールなしの静的サイト）。

このリポジトリは **GitHub → Vercel（Webで公開） → Google Play（TWAでアプリ化）** の3段階で公開する前提で構成されています（[のれん承](https://github.com)プロジェクトと同じ手順）。

## ファイル構成

| ファイル | 役割 |
|---|---|
| `index.html` | HTML構造・CSS・UI要素 |
| `data.js` | テナントカタログ・カテゴリ・経済定数などのマスタデータ |
| `sim.js` | 経済シミュレーションエンジン（来館者数・売上・賃料・退店判定・月次決算） |
| `mall3d.js` | Three.js製3Dモールエンジン（建物生成・区画ビジュアル・歩行・NPC） |
| `ui.js` | 画面制御（タブ・モーダル・HUD） |
| `manifest.json` | PWAマニフェスト |
| `icon.svg` / `icon-maskable.svg` | アプリアイコン |
| `.well-known/assetlinks.json` | **TWA化の後半で編集が必要**（Androidアプリとこのサイトの所有関係を証明） |
| `vercel.json` | Vercel配信設定 |

ローカル確認: `.claude/launch.json` の `yumemall`（port **8770**）。

外部ライブラリはCDN経由のThree.js r128のみ（ビルド不要、`index.html`を静的配信するだけで動作）。

---

## Step 1. GitHubにpush

1. https://github.com/new で新規リポジトリを作成（例：`yumemall`）。READMEやgitignoreは追加しない（空リポジトリにする）。
2. このフォルダから push：

```bash
cd /c/Users/81909/YumeMall
git remote add origin https://github.com/<あなたのユーザー名>/yumemall.git
git branch -M main
git push -u origin main
```

---

## Step 2. Vercelでデプロイ

1. https://vercel.com にGitHubアカウントでログイン。
2. 「Add New... → Project」→ `yumemall` リポジトリをImport。
3. Framework Presetは **Other**（ビルド設定不要）。
4. Deployをクリック。`https://yumemall-xxxx.vercel.app` のようなURLが発行されます。
5. 以後は `main` ブランチへのpushで自動再デプロイ。

発行URLをスマホのChromeで開き「ホーム画面に追加」でPWAとして動作確認してください。

---

## Step 3. Google Play向けにTWAを生成

1. https://www.pwabuilder.com/ にVercelのURLを入力して「Start」。
2. 「Package for stores」→「Android」。Package ID（例：`com.yourname.yumemall`）・署名鍵を設定。**新規作成した署名鍵(.jks)とパスワードは紛失しないよう保管**。
3. 生成された `.aab` とSHA-256フィンガープリントをダウンロード・コピー。

---

## Step 4. assetlinks.json を更新して再デプロイ

`.well-known/assetlinks.json` の `package_name` と `sha256_cert_fingerprints` をStep 3の実際の値に書き換えてpush。

```bash
git add .well-known/assetlinks.json
git commit -m "assetlinks更新"
git push
```

`https://あなたのURL/.well-known/assetlinks.json` にアクセスして正しいJSONが返ることを確認。これが未設定だとTWA起動時にアドレスバーが表示されてしまいます。

---

## Step 5. Google Play Consoleで公開

1. https://play.google.com/console （初回$25の登録料）。
2. Package IDでアプリを新規作成し、内部テスト or 製品版リリースに `.aab` をアップロード。
3. ストア掲載情報（アプリ名・説明・スクリーンショット・アイコン・プライバシーポリシーURL）を入力。
4. コンテンツレーティング・データセーフティ（外部通信なし、`localStorage` にセーブをブラウザ内保存するのみ）に回答して審査提出。

---

## 今後のアップデート

`index.html`/`*.js` を編集 → `git push` → Vercelが自動反映。TWAはWebの最新版を表示するラッパーなので、**中身の変更だけならPlayストアの再提出は不要**です。Package IDや署名鍵を変えない限り既存ユーザーへの更新配信も維持されます。

## 補足：セーブデータについて

`localStorage` にオートセーブ（月次決算ごと + 設定タブから手動保存）。Webブラウザ版とTWAアプリ版は別オリジン扱いのため、セーブは共有されません。

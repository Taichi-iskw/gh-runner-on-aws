# GitHub Self-Hosted-Runner On AWS

![alt text](image.png)

このプロジェクトは、GitHub ActionsのセルフホストランナーをAWS上で動作させるためのソリューションです。  
CodeBuildを使用してランナーを動的に起動し、ジョブごとにランナーを作成することで、効率的かつスケーラブルな実行環境を提供します。

## 特徴

- **動的ランナー生成**: CodeBuildを使用してジョブごとにランナーを生成。
- **GitHub App連携**: Secrets Managerを使用してGitHub Appの認証情報を安全に管理。
- **イベント駆動型アーキテクチャ**: LambdaとSQSを使用して非同期処理を実現。

## セットアップ

### 前提条件

- Node.js (v16以上)
- AWS CLI
- AWSアカウント
- CDK (AWS Cloud Development Kit)

### 手順

1. **依存関係のインストール**

   ```bash
   npm install
   ```

2. **GitHub Appの作成**

   - GitHubで新しいGitHub Appを作成します。
   - 必要な権限を設定し、App IDとプライベートキーを取得します。

3. **Secrets Managerに認証情報をアップロード**

   プライベートキーとApp IDをSecrets Managerにアップロードします。

   ```bash
   ./upload-github-app-secret.sh <secret-name> <path-to-private-key-pem> <github-app-id>
   ```

4. **デプロイ**

   CDKを使用してスタックをデプロイします。

   ```bash
   npm run build
   cdk deploy
   ```

## 使用方法

1. GitHubリポジトリにWebhookを設定し、API Gatewayのエンドポイントを指定します。
2. GitHub Actionsのジョブで`self-hosted`ラベルを指定します。
3. ジョブがキューに追加されると、CodeBuildがランナーを起動し、ジョブを実行します。

## ライセンス

このプロジェクトはMITライセンスの下で提供されています。

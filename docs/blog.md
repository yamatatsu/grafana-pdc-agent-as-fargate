# Grafana CloudからVPC内のデータにアクセスできるPrivate Data Source Connectを使ってみた

# はじめに
この記事では、Grafana CloudからVPC内のAuroraにアクセスできるPDC(Private Data source Connect)を構築する方法について説明します。

公式doc:
https://grafana.com/docs/grafana-cloud/connect-externally-hosted/private-data-source-connect/

公式docにはkubernetes, docker, binaryの3つの方法が記載されていますが、今回はdocker imageをfargate上で動かしてみます。
構築にはAWS CDKを使用します。

# やり方

## 1. Grafana Cloudのアカウントを作成する

## 2. PDC用のsining tokenを発行する

サイドナビゲーションの`Connections`→`Private data source connect`の順でクリックして、新しいPDC networkを作成します。

次に方式を選択します。今回は`Docker`を選択します。

次にtokenを新規に発行します。

これで`3.`の項目に`-token`, `-cluster`, `-gcloud-hosted-grafana-id`の3項目に必要な値が表示されます。

## 3. 必要な設定値をSSM Parameter Storeに保存する

```bash
aws ssm put-parameter --type String --name '/grafana-pdc-agent/token' --value "<<置き換えて>>"
aws ssm put-parameter --type String --name '/grafana-pdc-agent/cluster' --value "<<置き換えて>>"
aws ssm put-parameter --type String --name '/grafana-pdc-agent/gcloud-hosted-grafana-id' --value "<<置き換えて>>"
```

## 4. CDKで構築する

コード全体は以下のリポジトリからご確認ください。
https://github.com/yamatatsu/grafana-pdc-agent-as-fargate/tree/main/packages/cdk

ここでは、fargateのコンテナを作成する部分のコードを抜粋します。

```ts
const pdcAgentToken = ssm.StringParameter
  .fromStringParameterName(this, "TokenSsmParam", "/grafana-pdc-agent/token")
  .stringValue;
const pdcAgentCluster = ssm.StringParameter
  .fromStringParameterName(this, "ClusterSsmParam", "/grafana-pdc-agent/cluster")
  .stringValue;
const gcloudHostedGrafanaId = ssm.StringParameter
  .fromStringParameterName(this, "GrafanaIdSsmParam", "/grafana-pdc-agent/gcloud-hosted-grafana-id")
  .stringValue;

taskDef.addContainer("PdcAgentContainer", {
  image: ecs.ContainerImage.fromRegistry("grafana/pdc-agent:0.0.32"),
  command: [
    "-token",
    pdcAgentToken,
    "-cluster",
    pdcAgentCluster,
    "-gcloud-hosted-grafana-id",
    gcloudHostedGrafanaId,
  ],
  // PDC Agent はファイルシステムへの書き込みが必要
  readonlyRootFilesystem: false,
});
```

ssm parameterを使ったことには特に理由はありません。
CDK Contextでも環境変数でも良いです。

特にtokenについて、Secure Stringとして保存してコンテナの環境変数に渡すことを考えたのですが、[`token`を環境変数として渡す方式はまだサポートされていないようです](https://github.com/grafana/pdc-agent/issues/102)。

加えて、このイメージは内部で秘密鍵や証明書の生成を行うため、`readonlyRootFilesystem: true`は使えません。
この設定はデフォルトは`false`なので設定は不要ですが、セキュリティ要件見直し時に意識できるようにコメントを残してあります。

## 5. 接続を確認する

CDKがデプロイできたら、Grafana Cloudのコンソールから確認ができます。
Test agent connectionをクリックして、接続が成功することを確認します。

あとは、fargateからauroraなどのVPC内データソースにアクセスできるように整備すれば、Grafana CloudからVPC内のデータソースにアクセスできるようになります。

# おわりに

今回はGrafana CloudからVPC内のAuroraにアクセスできるPDCを構築する方法についてCDKのコードを交えて紹介しました。

Grafana OnCallなどのサービスは、まだAMGではサポートされておらずGrafana Cloudは有効な選択肢です。
そんな時に、必要なデータがVPCの中にあっても、PDCを使えば簡単に接続できるので、ぜひ試してみてください。

# Grafana CloudからVPC内のAuroraにアクセスできるPDCを構築してみた

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
aws ssm put-parameter --type String --name '/grafana-pdc-agent/token' --value "xxxx <<置き換えて>>"
aws ssm put-parameter --type String --name '/grafana-pdc-agent/cluster' --value "xxxx <<置き換えて>>"
aws ssm put-parameter --type String --name '/grafana-pdc-agent/gcloud-hosted-grafana-id' --value "xxxx <<置き換えて>>"
```

## 4. CDKで構築する



```ts
const pdcAgentToken = ssm.StringParameter.fromStringParameterName(
  this,
  "TokenSsmParam",
  "/grafana-pdc-agent/token",
).stringValue;
const pdcAgentCluster = ssm.StringParameter.fromStringParameterName(
  this,
  "ClusterSsmParam",
  "/grafana-pdc-agent/cluster",
).stringValue;
const gcloudHostedGrafanaId = ssm.StringParameter.fromStringParameterName(
  this,
  "GrafanaIdSsmParam",
  "/grafana-pdc-agent/gcloud-hosted-grafana-id",
).stringValue;

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
  readonlyRootFilesystem: false,
});
```

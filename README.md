## ACMで証明書発行して、CloudFrontにカスタムSSL証明書を設定 + S3  

参考したSource: https://github.com/rednes/cdk-cloudfront-cross-region-sample/blob/use-cdk-remote-stack/lib/cloudfront-stack.ts

``` 
.env
CDK_DEFAULT_ACCOUNT=123456789876
CDK_ACM_REGION=us-east-1
CDK_DEFAULT_REGION=ap-northeast-1
HOST_NAME=test
DOMAIN_NAME=example.com

```

### 前提
Route53のホストゾーンが設定されている
AWS CLI、AWS CDKがインストールされている

```
AWS CLI インストール
https://docs.aws.amazon.com/ja_jp/cli/latest/userguide/getting-started-install.html

AWS CDK インストール
npm install -g aws-cdk
```


### 使用方法

```
`.env`ファイルを作成して、必要な項目を設定
注意：証明書（Certificate Manager）は、region: us-east-1 で作成する必要がある

cdkがグローバルに入っている場合

cdk bootstrap

cdk deploy --all

```

```
cdk bootstrap 後にコードや`.env`を編集した場合

cdk synth

```

```

削除
cdk destroy --all 

```

Tips: キャッシュが残っていそうなときは、以下を実行してから、`cdk bootstrap`

```
rm -rf cdk.context.json
rm -rf cdk.out

```

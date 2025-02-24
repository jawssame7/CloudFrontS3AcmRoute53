## ACMで証明書発行して、CloudFrontにカスタムSSL証明書を設定 + S3  

参考したSource: https://github.com/rednes/cdk-cloudfront-cross-region-sample/blob/use-cdk-remote-stack/lib/cloudfront-stack.ts

### 設定

`.env.examle`をコピーして`.env`にファイル名を変更して使用

#### .envの設定内容

``` 
.env
CDK_DEFAULT_ACCOUNT=123456789876  <- aws accountId
CDK_ACM_REGION=us-east-1          <- ACM,Rambda@Edge作成リージョン
CDK_DEFAULT_REGION=ap-northeast-1 <- S3バケット作成リージョン
HOST_NAME=test                    <- ホスト名
DOMAIN_NAME=example.com           <- ドメイン名
BASIC_AUTH_USER=test              <- ベーシック認証ユーザー
BASIC_AUTH_PASSWORD=passw         <- ベーシック認証パスワード
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

### Tips

ParameterAlreadyExists エラーが出たとき
（何度も`deploy --all`,`destroy --all`を繰り返すと発生することがある）

> ❌  CertStack failed: _ToolkitError: The stack named CertStack failed creation, it may need to be manually deleted from the AWS console: ROLLBACK_COMPLETE: Received response status > [FAILED] from custom resource. Message returned: ParameterAlreadyExists: The parameter already exists. To overwrite this value, set the overwrite option in the request to true.

```
ssmのparameterを一覧表示する
aws ssm get-parameters-by-path --path '/' --recursive

特定のparameterを削除する
aws ssm delete-parameter --name キー

```

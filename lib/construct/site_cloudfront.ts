import { Construct } from 'constructs'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets'
import exp = require('constants')
import * as cdk from 'aws-cdk-lib'
import { BasicAuthLambdaEdgeConstruct } from './basic_auth_lambda_edge'
import * as lambda from 'aws-cdk-lib/aws-lambda'

export interface SiteCloudFrontProps {
  domainName: string
  hostName: string
  certificate: acm.Certificate
  siteBucket: s3.Bucket
  lambdaFunction?: lambda.Function
  subDomain: string
  authUser: string
  authPassword: string
  enableBasicAuth?: boolean
}

export class SiteCloudFrontConstruct extends Construct {
  public readonly distribution: cloudfront.Distribution
  public readonly hostedZone: route53.IHostedZone

  constructor(scope: Construct, id: string, props: SiteCloudFrontProps) {
    super(scope, id)

    // ベーシック認証の設定（デフォルトはfalse）
    const enableBasicAuth = props.enableBasicAuth ?? false
    let functionAssociations: cloudfront.FunctionAssociation[] = []
    if (enableBasicAuth) {
      // Base64 エンコード
      const base64Encoded = Buffer.from(`${props.authUser}:${props.authPassword}`).toString('base64')

      // CloudFront Function の作成
      const basicAuthFunction = new cloudfront.Function(this, 'BasicAuthFunction', {
        functionName: 'BasicAuthFunction',
        code: cloudfront.FunctionCode.fromInline(`
          function handler(event) {
            var request = event.request;
            var headers = request.headers;

            // echo -n user:pass | base64
            var authString = "Basic ${base64Encoded}";

            if (
              typeof headers.authorization === "undefined" ||
              headers.authorization.value !== authString
            ) {
              return {
                statusCode: 401,
                statusDescription: "Unauthorized",
                headers: { "www-authenticate": { value: "Basic" } }
              };
            }

            return request;
          }
        `)
      })

      functionAssociations = [
        {
          function: basicAuthFunction,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST
        }
      ]
    }

    // キャッシュポリシーの作成（短めの TTL 設定）
    const cachePolicy = new cloudfront.CachePolicy(this, 'CustomCachePolicy', {
      defaultTtl: cdk.Duration.minutes(5),
      minTtl: cdk.Duration.minutes(1),
      maxTtl: cdk.Duration.minutes(10),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true
    })

    // CloudFront ディストリビューション OAI と S3 バケットの関連付け
    this.distribution = new cloudfront.Distribution(this, 'WebsiteDistribution', {
      defaultBehavior: {
        origin: cloudfrontOrigins.S3BucketOrigin.withOriginAccessControl(props.siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cachePolicy,
        functionAssociations: functionAssociations,
        //Lambda@Edge関数との紐付け設定
        edgeLambdas: props.lambdaFunction
          ? [
              {
                eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
                functionVersion: props.lambdaFunction.currentVersion
              }
            ]
          : []
      },
      domainNames: [props.subDomain],
      certificate: props.certificate,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      errorResponses: [
        {
          httpStatus: 403,
          responsePagePath: '/index.html',
          responseHttpStatus: 200
        },
        {
          httpStatus: 404,
          responsePagePath: '/index.html',
          responseHttpStatus: 200
        }
      ]
    })

    // Route 53 の既存ホストゾーンを取得
    this.hostedZone = route53.HostedZone.fromLookup(this, 'MyHostedZone', {
      domainName: props.domainName
    })

    // Route 53 A レコード（CloudFront へルーティング）
    new route53.ARecord(this, 'AliasRecord', {
      zone: this.hostedZone,
      target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(this.distribution)),
      recordName: props.hostName
    })
  }
}

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from "aws-cdk-lib/aws-iam";
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as dotenv from "dotenv";
import { CertStack } from './cloud_front_s3_acm_cert_stack';

interface CloudfrontStackProps extends cdk.StackProps {
  hostName: string
  domainName: string
  certificate: certificatemanager.Certificate
};

// dotenv を初期化
dotenv.config();

export class CloudFrontS3AcmRoute53Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: CloudfrontStackProps) {
    super(scope, id, props);

    if (!props) {
      throw new Error("Props must be defined");
    }

    const subDomain = `${props.hostName}.${props.domainName}`;

    // Create OriginAccessIdentity
    const oai = new cloudfront.OriginAccessIdentity(this, "myOai");

    // S3 バケット（静的サイトホスティング）
    const siteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: subDomain.replace(/\./g, "-"),
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // S3バケットへのデプロイ
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset('./website')],
      accessControl: s3.BucketAccessControl.PRIVATE,
      destinationBucket: siteBucket,
      retainOnDelete: false,
    });

    const siteBucketPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["s3:GetObject"],
      principals: [
        new iam.CanonicalUserPrincipal(
          oai.cloudFrontOriginAccessIdentityS3CanonicalUserId,
        ),
      ],
      resources: [siteBucket.bucketArn + "/*"],
    });
    siteBucket.addToResourcePolicy(siteBucketPolicy);

    // キャッシュポリシーの作成（短めの TTL 設定）
    const cachePolicy = new cloudfront.CachePolicy(this, 'CustomCachePolicy', {
      defaultTtl: cdk.Duration.minutes(5),
      minTtl: cdk.Duration.minutes(1),
      maxTtl: cdk.Duration.minutes(10),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
    });

    // CloudFront ディストリビューション OAI と S3 バケットの関連付け
    const distribution = new cloudfront.Distribution(this, 'WebsiteDistribution', {
        defaultBehavior: {
          origin: cloudfrontOrigins.S3BucketOrigin.withOriginAccessControl(siteBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cachePolicy,
        },
        domainNames: [subDomain],
        certificate: props.certificate,
        priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
        errorResponses: [
          {
            httpStatus: 403,
            responsePagePath: "/index.html",
            responseHttpStatus: 200,
          },
          {
            httpStatus: 404,
            responsePagePath: "/index.html",
            responseHttpStatus: 200,
          },
        ],
      },
    );

    // Route 53 の既存ホストゾーンを取得
    const hostedZone = route53.HostedZone.fromLookup(this, 'MyHostedZone', {
      domainName: props.domainName,
    });

    // Route 53 A レコード（CloudFront へルーティング）
    new route53.ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(distribution)),
      recordName: props.hostName,
    });

    // 出力
    new cdk.CfnOutput(this, 'CloudFrontURL', { value: `https://${distribution.domainName}` });
    new cdk.CfnOutput(this, 'SiteURL', { value: `https://${subDomain}` });
    new cdk.CfnOutput(this, 'BucketName', { value: siteBucket.bucketName });
    new cdk.CfnOutput(this, 'HostedZoneID', { value: hostedZone.hostedZoneId });
  }
}
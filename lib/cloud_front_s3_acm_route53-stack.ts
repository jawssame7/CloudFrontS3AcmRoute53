import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets'
import { Construct } from 'constructs'
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import * as dotenv from 'dotenv'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import { BasicAuthLambdaEdgeConstruct } from './construct/basic_auth_lambda_edge'
import { SiteBucketS3Construct } from './construct/site_bucket_s3'
import { SiteCloudFrontConstruct } from './construct/site_cloudfront'

interface CloudfrontStackProps extends cdk.StackProps {
  hostName: string
  domainName: string
  certificate: certificatemanager.Certificate
  lambdaFunction?: lambda.Function
}

// dotenv を初期化
dotenv.config()

export class CloudFrontS3AcmRoute53Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: CloudfrontStackProps) {
    super(scope, id, props)

    if (!props) {
      throw new Error('Props must be defined')
    }

    const subDomain = `${props.hostName}.${props.domainName}`

    const siteBucketS3Construct = new SiteBucketS3Construct(this, 'SiteBucketS3', {
      bucketName: subDomain.replace(/\./g, '-'),
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })

    // BasicAuth Lambda@Edge us-east-1 で作成する必要があるため、スタックを作成

    // CludFront Distribution
    const siteCloudFrontConstruct = new SiteCloudFrontConstruct(this, 'SiteCloudFront', {
      domainName: props.domainName,
      hostName: props.hostName,
      authUser: process.env.BASIC_AUTH_USER ?? '',
      authPassword: process.env.BASIC_AUTH_PASSWORD ?? '',
      certificate: props.certificate,
      siteBucket: siteBucketS3Construct.siteBucket,
      subDomain: subDomain
    })

    // 出力
    new cdk.CfnOutput(this, 'CloudFrontURL', { value: `https://${siteCloudFrontConstruct.distribution.domainName}` })
    new cdk.CfnOutput(this, 'SiteURL', { value: `https://${subDomain}` })
    new cdk.CfnOutput(this, 'BucketName', { value: siteBucketS3Construct.siteBucket.bucketName })
    new cdk.CfnOutput(this, 'HostedZoneID', { value: siteCloudFrontConstruct.hostedZone.hostedZoneId })
  }
}

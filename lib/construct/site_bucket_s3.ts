import { Construct } from 'constructs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as cdk from 'aws-cdk-lib'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'

export interface SiteBucketS3Props {
  bucketName: string
  autoDeleteObjects?: boolean
  removalPolicy?: cdk.RemovalPolicy
}

export class SiteBucketS3Construct extends Construct {
  public readonly siteBucket: s3.Bucket

  constructor(scope: Construct, id: string, props: SiteBucketS3Props) {
    super(scope, id)

    // S3 バケット（静的サイトホスティング）
    this.siteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: props.bucketName,
      autoDeleteObjects: props.autoDeleteObjects ?? true,
      removalPolicy: props.removalPolicy ?? cdk.RemovalPolicy.DESTROY
    })

    // S3バケットへのデプロイ
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset('./website')],
      accessControl: s3.BucketAccessControl.PRIVATE,
      destinationBucket: this.siteBucket,
      retainOnDelete: false
    })

    // Create OriginAccessIdentity
    const oai = new cloudfront.OriginAccessIdentity(this, 'myOai')

    const siteBucketPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:GetObject'],
      principals: [new iam.CanonicalUserPrincipal(oai.cloudFrontOriginAccessIdentityS3CanonicalUserId)],
      resources: [this.siteBucket.bucketArn + '/*']
    })
    this.siteBucket.addToResourcePolicy(siteBucketPolicy)
  }
}

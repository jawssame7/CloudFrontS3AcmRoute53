#!/usr/bin/env node
import * as dotenv from 'dotenv'
import * as cdk from 'aws-cdk-lib'
import { CloudFrontS3AcmRoute53Stack } from '../lib/cloud_front_s3_acm_route53-stack'
import { CertStack } from '../lib/cloud_front_s3_acm_cert_stack'
import { CloudFrontLambdaEdgeStack } from '../lib/cluod_front_lambda_edge_stack'

// dotenv を初期化
dotenv.config()

const account = process.env.CDK_DEFAULT_ACCOUNT
const domainName =
  process.env.DOMAIN_NAME ??
  (() => {
    throw new Error('DOMAIN_NAME is not defined')
  })()
const hostName =
  process.env.HOST_NAME ??
  (() => {
    throw new Error('HOST_NAME is not defined')
  })()

const envJP: cdk.Environment = {
  account,
  region: 'ap-northeast-1'
}

const envUS: cdk.Environment = {
  account,
  region: 'us-east-1'
}

const app = new cdk.App()
const certStack = new CertStack(app, 'CertStack', {
  env: envUS,
  crossRegionReferences: true,
  domainName,
  hostName
})

// const lambdaEdgeStack = new CloudFrontLambdaEdgeStack(app, 'CloudFrontLambdaEdgeStack', {
//   env: envUS,
//   crossRegionReferences: true,
//   authUser: process.env.BASIC_AUTH_USER ?? '',
//   authPassword: process.env.BASIC_AUTH_PASSWORD ?? '',
//   hostName,
//   domainName
// })

new CloudFrontS3AcmRoute53Stack(app, 'CloudFrontS3AcmRoute53Stack', {
  env: envJP,
  crossRegionReferences: true,
  domainName,
  hostName,
  certificate: certStack.certificate
})

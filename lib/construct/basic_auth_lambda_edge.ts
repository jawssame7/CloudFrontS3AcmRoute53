import { Construct } from 'constructs'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import path = require('path')
import * as fs from 'fs'
import * as iam from 'aws-cdk-lib/aws-iam'

interface BasicAuthLambdaEdgeProps {
  authUser: string
  authPassword: string
  hostname: string
  domainName: string
}

const createlambdaFunctionName = (hostName: string, domainName: string) => {
  return `${hostName}_${domainName}_basic-auth.handler`
}

const createLambdaEdgeCode = async (authUser: string, authPassword: string, lambdaFuncName: string) => {
  // Lambda@Edge のコードを動的に作成
  const lambdaCode = `
    'use strict';
    export const handler = (event, context, callback) => {
      const request = event.Records[0].cf.request;
      const headers = request.headers;

      const authUser = "${authUser}";
      const authPass = "${authPassword}";

      const authString = 'Basic ' + Buffer.from(authUser + ':' + authPass).toString('base64');

      if (!headers.authorization || headers.authorization[0].value !== authString) {
        const response = {
          status: '401',
          statusDescription: 'Unauthorized',
          body: 'Unauthorized',
          headers: {
            'www-authenticate': [{ key: 'WWW-Authenticate', value: 'Basic' }],
          },
        };
        callback(null, response);
        return;
      }

      callback(null, request);
    };`

  // ローカルの `lambda` ディレクトリに authHandler.ts を作成
  const lambdaDir = path.join(__dirname, '../../lambda')
  if (!fs.existsSync(lambdaDir)) {
    fs.mkdirSync(lambdaDir)
  }
  fs.writeFileSync(path.join(lambdaDir, `index.js`), lambdaCode)
}

export class BasicAuthLambdaEdgeConstruct extends Construct {
  public readonly lambdaEdge: lambda.Function

  constructor(scope: Construct, id: string, props: BasicAuthLambdaEdgeProps) {
    super(scope, id)

    // Lambda@Edge のコードを作成
    const lambdaFuncName = createlambdaFunctionName(props.hostname, props.domainName)
    createLambdaEdgeCode(props.authUser, props.authPassword, lambdaFuncName)

    this.lambdaEdge = new lambda.Function(this, 'BasicAuthLambdaEdge', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda')),
      handler: `index.handler`,
      runtime: lambda.Runtime.NODEJS_18_X,
      role: new iam.Role(this, 'BasicAuthLambdaEdgeRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')]
      })
    })
  }
}

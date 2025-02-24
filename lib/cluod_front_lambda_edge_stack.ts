import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import { BasicAuthLambdaEdgeConstruct } from './construct/basic_auth_lambda_edge'

interface CloudFrontLambdaEdgeStackProps extends cdk.StackProps {
  authUser: string
  authPassword: string
  hostName: string
  domainName: string
}

export class CloudFrontLambdaEdgeStack extends cdk.Stack {
  public readonly lambdaEdge: lambda.Function

  constructor(scope: Construct, id: string, props: CloudFrontLambdaEdgeStackProps) {
    super(scope, id, props)

    if (!props) {
      throw new Error('Props must be defined')
    }

    const basicAuthLambdaEdgeConstruct = new BasicAuthLambdaEdgeConstruct(this, 'BasicAuthLambdaEdgeConstruct', {
      authUser: props.authUser,
      authPassword: props.authPassword,
      hostname: props.hostName,
      domainName: props.domainName
    })

    this.lambdaEdge = basicAuthLambdaEdgeConstruct.lambdaEdge
  }
}

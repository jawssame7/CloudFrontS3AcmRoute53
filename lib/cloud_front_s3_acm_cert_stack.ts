import * as cdk from 'aws-cdk-lib';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

interface AcmForCloudfrontStackProps extends cdk.StackProps {
  hostName: string
  domainName: string
};

export class CertStack extends cdk.Stack {

  public readonly certificate: certificatemanager.Certificate;
  
  constructor(scope: Construct, id: string, props?: AcmForCloudfrontStackProps) {
    super(scope, id, props);

    if (!props) {
      throw new Error("Props must be defined");
    }

    const hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
      domainName: props.domainName,
    });

    this.certificate = new certificatemanager.Certificate(this, "Certificate", {
      domainName: `${props.hostName}.${props.domainName}`,
      validation: certificatemanager.CertificateValidation.fromDns(hostedZone),
    });
  }
}
import { Stack, StackProps } from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as core from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class AwsCdkDemoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'vpc');

    // Set up database
    const credentials = rds.Credentials.fromGeneratedSecret('dbadmin');

    const cluster = new rds.DatabaseCluster(this, 'db-cluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_13_6,
      }),
      credentials,
      defaultDatabaseName: 'mydb',
      instanceProps: {
        vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_NAT
        }
      }
    });

    const dbSecret = cluster.node.children.filter(child => 
      child instanceof rds.DatabaseSecret
    )[0] as rds.DatabaseSecret;

    // Set up lambdas
    const securityGroup = new ec2.SecurityGroup(this, 'lambda-security-group', {
      vpc,
      allowAllOutbound: true,
      description: 'Security group shared by lambdas'
    });
    // Allow Postgres connection from all lambdas
    securityGroup.connections.allowTo(cluster, ec2.Port.tcp(5432)); 

    const commonOptions = {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset('../code'),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_NAT
      },
      environment: { // Note: Prefer AWS Secrets Manager instead of this in real code!
        RDS_USERNAME: dbSecret.secretValueFromJson('username').unsafeUnwrap().toString(),
        RDS_PASSWORD: dbSecret.secretValueFromJson('password').unsafeUnwrap().toString(),
        RDS_HOST: cluster.clusterEndpoint.hostname,
      },
      securityGroup
    }

    const appLambda = new lambda.Function(this, 'appFunction', {
      ...commonOptions,
      handler: 'handlers.app'
    })

    const migrationsLambda = new lambda.Function(this, 'migrationsFunction', {
      ...commonOptions,
      handler: 'handlers.runMigrations'
    })

    // Run database migrations every time the stack deploys
    const migrationsProvider = new cr.Provider(this, 'migrationsProvider', {
      onEventHandler: migrationsLambda
    });

    const migration = new core.CustomResource(this, 'migrations', {
      serviceToken: migrationsProvider.serviceToken,
      properties: {
        // Run migrations every time
        migrationsRun: new Date().toString()
      }
    })

    migration.node.addDependency(cluster);
  }
}

#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AwsCdkDemoStack } from '../lib/aws-cdk-demo-stack';
import { userInfo } from 'os';

const app = new cdk.App({
  context: {
    // May be overridden by cdk.json or the --context parameter
    env: userInfo().username
  }
});
// Set the stack name based on the environment
new AwsCdkDemoStack(app, `AwsCdkDemoStack-${app.node.tryGetContext('env')}`, {
  /* Deploys this stack to the AWS Account and Region that are 
   * implied by the current CLI configuration. */
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },
});
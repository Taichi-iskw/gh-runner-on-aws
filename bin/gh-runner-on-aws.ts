#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { GhRunnerOnAwsStack } from '../lib/gh-runner-on-aws-stack';

const app = new cdk.App();
new GhRunnerOnAwsStack(app, 'GhRunnerOnAwsStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
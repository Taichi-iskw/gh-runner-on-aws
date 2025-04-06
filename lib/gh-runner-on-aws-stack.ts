import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as eventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as path from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'; 
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class GhRunnerOnAwsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // SecretsManager
    const githubAppSecret = new secretsmanager.Secret(this, 'GitHubAppSecret', {
      secretName: 'github-app-secret',
      description: 'GitHub App private key and App ID for GitHub Actions Runner',
      secretObjectValue: {
        app_id: cdk.SecretValue.unsafePlainText(''), 
        private_key: cdk.SecretValue.unsafePlainText(''),
      },
    });

    // SQS Queue
    const queue = new sqs.Queue(this, 'WebhookQueue', {
      visibilityTimeout: cdk.Duration.minutes(5),
    });

    // Lambda1: Webhook受信 → SQSへ
    const webhookReceiverLambda = new NodejsFunction(this, 'WebhookReceiverLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, 'lambdas/webhook-receiver/index.ts'), 
      handler: 'handler',
      environment: {
        QUEUE_URL: queue.queueUrl,
      },
      bundling: {
        externalModules: ['aws-sdk'], 
      },
    });
    queue.grantSendMessages(webhookReceiverLambda);

    // API GatewayでWebhook受信
    const api = new apigateway.RestApi(this, 'WebhookAPI');
    const webhookIntegration = new apigateway.LambdaIntegration(webhookReceiverLambda);
    api.root.addMethod('POST', webhookIntegration);

    // CodeBuild Project (Runner用)
    const runnerProject = new codebuild.Project(this, 'GitHubActionsRunnerProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              'echo Installing GitHub Actions Runner...',
              'mkdir actions-runner && cd actions-runner',
              'curl -O -L https://github.com/actions/runner/releases/download/v2.316.0/actions-runner-linux-x64-2.316.0.tar.gz',
              'tar xzf ./actions-runner-linux-x64-2.316.0.tar.gz',
              'chmod +x ./config.sh ./run.sh'
            ]
          },
          build: {
            commands: [
              './config.sh --url https://github.com/${OWNER}/${REPO} --token ${JIT_TOKEN} --labels codebuild-runner --unattended',
              './run.sh'
            ]
          }
        }
      }),
    });

    // Lambda2: SQS → GitHub JITトークン取得 → CodeBuild起動
    const startRunnerLambda = new NodejsFunction(this, 'StartRunnerLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, 'lambdas/start-runner/index.ts'),
      handler: 'handler',
      environment: {
        GITHUB_APP_SECRET_NAME: githubAppSecret.secretName, 
        CODEBUILD_PROJECT_NAME: runnerProject.projectName,
      },
      bundling: {
        externalModules: ['aws-sdk'], 
      },
      timeout: cdk.Duration.minutes(5),
    });
    startRunnerLambda.addEventSource(new eventSources.SqsEventSource(queue));

    // Grant permissions to start CodeBuild projects
    startRunnerLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['codebuild:StartBuild'],
      resources: [runnerProject.projectArn],
    }));
    
    // Grant permissions to get secrets
    startRunnerLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['secretsmanager:GetSecretValue'],
      resources: [githubAppSecret.secretArn],
    }));
  }
}

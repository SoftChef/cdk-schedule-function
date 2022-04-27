const { awscdk, AUTOMATION_TOKEN } = require('projen');

const PROJECT_NAME = '@softchef/cdk-schedule-function';
const PROJECT_DESCRIPTION = 'Manageable schedule to invoke lambda functions';

const project = new awscdk.AwsCdkConstructLibrary({
  authorName: 'SoftChef',
  authorEmail: 'poke@softchef.com',
  authorUrl: 'https://www.softchef.com',
  authorOrganization: true,
  name: PROJECT_NAME,
  description: PROJECT_DESCRIPTION,
  repositoryUrl: 'https://github.com/softchef/cdk-schedule-function.git',
  cdkVersion: '1.73.0',
  defaultReleaseBranch: 'main',
  /**
   * we default release the main branch(cdkv2) with major version 2.
   */
   majorVersion: 2,
   releaseBranches: {
     cdkv1: {
       npmDistTag: 'cdkv1',
       majorVersion: 1,
     },
   },
  cdkDependencies: [
    '@aws-cdk/core',
    '@aws-cdk/aws-apigateway',
    '@aws-cdk/aws-dynamodb',
    '@aws-cdk/aws-events',
    '@aws-cdk/aws-events-targets',
    '@aws-cdk/aws-iam',
    '@aws-cdk/aws-lambda',
    '@aws-cdk/aws-lambda-nodejs',
  ],
  bundledDeps: [
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/client-eventbridge',
    '@aws-sdk/client-lambda',
    '@aws-sdk/client-s3', // Hotfix for aws-sdk-client-mock dependency.
    '@aws-sdk/lib-dynamodb',
    '@aws-sdk/util-dynamodb',
    '@softchef/lambda-events',
    '@softchef/cdk-restapi',
    '@types/uuid',
    'dayjs',
    'joi',
    'uuid',
  ],
  devDeps: [
    'aws-sdk-client-mock',
    'esbuild',
  ],
  depsUpgradeOptions: {
    ignoreProjen: false,
    workflowOptions: {
      schedule: {
        cron: ['0 1 * * *'],
      },
      labels: ['auto-approve', 'auto-merge'],
      secret: AUTOMATION_TOKEN,
    },
  },
  autoApproveOptions: {
    secret: 'GITHUB_TOKEN',
    allowedUsernames: ['MinCheTsai'],
  },
  keywords: [
    'cdk',
    'schedule',
    'events',
    'lambda',
    'function',
  ],
  tsconfig: {
    compilerOptions: {
      esModuleInterop: true,
      lib: [
        'ES2020',
        'DOM',
      ],
    },
  },
});

project.package.addField('resolutions', {
  'jest-environment-jsdom': '27.3.1',
});

const commonExclude = [
  'cdk.out',
  'cdk.context.json',
  'yarn-error.log',
];

project.npmignore.exclude(...commonExclude);
project.gitignore.exclude(...commonExclude);

project.synth();

const { AwsCdkConstructLibrary, DependenciesUpgradeMechanism, NpmAccess } = require('projen');

const AUTOMATION_TOKEN = 'PROJEN_GITHUB_TOKEN';

const project = new AwsCdkConstructLibrary({
  author: 'SoftChef',
  authorEmail: 'poke@softchef.com',
  authorUrl: 'https://www.softchef.com',
  authorOrganization: true,
  npmAccess: NpmAccess.PUBLIC,
  cdkVersion: '1.95.2',
  defaultReleaseBranch: 'main',
  name: '@softchef/cdk-schedule-function',
  description: 'Manageable schedule to invoke lambda functions',
  repositoryUrl: 'https://github.com/softchef/cdk-schedule-function.git',
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
    '@aws-sdk/lib-dynamodb',
    '@aws-sdk/util-dynamodb',
    '@softchef/lambda-events',
    '@softchef/cdk-restapi',
    '@types/uuid',
    '@types/node@15.12.2',
    'dayjs',
    'joi',
    'uuid',
  ],
  devDeps: [
    'aws-sdk-client-mock',
    'esbuild',
  ],
  depsUpgrade: DependenciesUpgradeMechanism.githubWorkflow({
    ignoreProjen: false,
    workflowOptions: {
      schedule: {
        cron: ['30 0 * * *'],
      },
      labels: ['auto-approve', 'auto-merge'],
      secret: AUTOMATION_TOKEN,
    },
  }),
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
  gitignore: [
    'src/**/dist',
  ],
});
project.synth();

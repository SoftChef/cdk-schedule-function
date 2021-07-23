const { AwsCdkConstructLibrary, NpmAccess, ProjectType } = require('projen');
const project = new AwsCdkConstructLibrary({
  author: 'softchef-iot-lab',
  authorEmail: 'poke@softchef.com',
  npmAccess: NpmAccess.PUBLIC,
  projectType: ProjectType.LIB,
  cdkVersion: '1.95.2',
  projenVersion: '0.27.6',
  initialVersion: '1.0.0',
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
  ],
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
  mergify: false,
});
project.synth();

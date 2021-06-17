const { AwsCdkConstructLibrary } = require('projen');
const project = new AwsCdkConstructLibrary({
  author: 'MinChe Tsai',
  authorAddress: 'tirme0812@gmail.com',
  cdkVersion: '1.95.2',
  defaultReleaseBranch: 'main',
  name: 'cdk-schedule-function',
  repositoryUrl: 'https://github.com/tirme0812/cdk-schedule-function.git',
});
project.synth();
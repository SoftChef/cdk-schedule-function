import * as lambda from '@aws-cdk/aws-lambda-nodejs';
import * as cdk from '@aws-cdk/core';
import { RestApi, HttpMethod } from '@softchef/cdk-restapi';
import { ScheduleFunction } from '../';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'cdk-schedule-function-demo');

const scheduleFunction = new ScheduleFunction(stack, 'DemoScheduleFunction', {
  recentMinutes: cdk.Duration.minutes(3),
});

scheduleFunction.addTargetFunction('testTarget', {
  targetFunction: new lambda.NodejsFunction(stack, 'TestTarget', {
    entry: './src/demo/test-target-function/app.ts',
  }),
});

// curl -X POST -d '{ "targetType": "testA", "description": "TestA", "schedules": [1624777111100], "context": {"a":1} }' https://hm1zv6yuhl.execute-api.ap-northeast-1.amazonaws.com/prod/schedules
// curl -X POST -d '{ "targetType": "CreateJob", "description": "Create Schedule Job", "schedules": [1624893249242], "context": {"a":1} }' https://eq8j6mmuq6.execute-api.ap-northeast-1.amazonaws.com/prod/jobs/schedules

new RestApi(stack, 'ScheduleApi', {
  enableCors: true,
  resources: [
    {
      path: '/schedules',
      httpMethod: HttpMethod.POST,
      lambdaFunction: scheduleFunction.createScheduleFunction,
    },
    {
      path: '/schedules',
      httpMethod: HttpMethod.GET,
      lambdaFunction: scheduleFunction.listSchedulesFunction,
    },
    {
      path: '/schedules/{scheduleId}',
      httpMethod: HttpMethod.GET,
      lambdaFunction: scheduleFunction.fetchScheduleFunction,
    },
    {
      path: '/schedules/{scheduleId}',
      httpMethod: HttpMethod.PUT,
      lambdaFunction: scheduleFunction.updateScheduleFunction,
    },
    {
      path: '/schedules/{scheduleId}',
      httpMethod: HttpMethod.DELETE,
      lambdaFunction: scheduleFunction.deleteScheduleFunction,
    },
  ],
});
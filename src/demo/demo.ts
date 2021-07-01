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
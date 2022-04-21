import {
  HttpMethod,
  RestApi,
} from '@softchef/cdk-restapi';
import {
  NodejsFunction,
} from 'aws-cdk-lib/aws-lambda-nodejs';
import {
  App,
  Duration,
  Stack,
} from 'aws-cdk-lib/core';
import {
  ScheduleFunction,
} from '../';

const app = new App();
const stack = new Stack(app, 'cdk-schedule-function-demo');

const scheduleFunction = new ScheduleFunction(stack, 'DemoScheduleFunction', {
  recentMinutes: Duration.minutes(3),
});

scheduleFunction.addTargetFunction('testTarget', {
  targetFunction: new NodejsFunction(stack, 'TestTarget', {
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
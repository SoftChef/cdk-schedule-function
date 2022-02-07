import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod,
} from '@aws-cdk/aws-apigatewayv2-alpha';
import {
  HttpLambdaIntegration,
} from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
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

const scheduleApi: HttpApi = new HttpApi(stack, 'ScheduleApi', {
  corsPreflight: {
    allowHeaders: [
      'Content-Type',
    ],
    allowMethods: [
      CorsHttpMethod.GET,
      CorsHttpMethod.POST,
    ],
    allowOrigins: [
      '*',
    ],
  },
});
scheduleApi.addRoutes({
  path: '/schedules',
  methods: [HttpMethod.POST],
  integration: new HttpLambdaIntegration('CreateScheduleFunctionIntegration', scheduleFunction.createScheduleFunction),
});
scheduleApi.addRoutes({
  path: '/schedules',
  methods: [HttpMethod.GET],
  integration: new HttpLambdaIntegration('ListSchedulesFunctionIntegration', scheduleFunction.listSchedulesFunction),
});
scheduleApi.addRoutes({
  path: '/schedules/{scheduleId}',
  methods: [HttpMethod.GET],
  integration: new HttpLambdaIntegration('FetchcheduleFunctionIntegration', scheduleFunction.fetchScheduleFunction),
});
scheduleApi.addRoutes({
  path: '/schedules/{scheduleId}',
  methods: [HttpMethod.PUT],
  integration: new HttpLambdaIntegration('UpdateScheduleFunctionIntegration', scheduleFunction.updateScheduleFunction),
});
scheduleApi.addRoutes({
  path: '/schedules/{scheduleId}',
  methods: [HttpMethod.DELETE],
  integration: new HttpLambdaIntegration('DeleteScheduleFunctionIntegration', scheduleFunction.deleteScheduleFunction),
});
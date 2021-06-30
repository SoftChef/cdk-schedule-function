/**
 * @todo
 * Verify QueryCommand, UpdateCommand
 */

process.env.TARGET_FUNCTIONS_NAME = JSON.stringify({
  testA: 'TestA-Function',
});

import {
  InvokeCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';
import {
  QueryCommand,
  DynamoDBDocumentClient,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  mockClient,
} from 'aws-sdk-client-mock';
import * as dispatchTarget from '../../lambda-assets/dispatch-target/app';
import { ScheduleData } from '../../lambda-assets/models/schedule-data';
import { ScheduleSeeds } from './seeds/schedule';

const expected = {
  schedules: ScheduleSeeds.all(),
};

test('Dispatch target success', async () => {
  const documentClientMock = mockClient(DynamoDBDocumentClient);
  documentClientMock.on(QueryCommand).resolves({
    Items: expected.schedules,
  });
  const lambdaClientMock = mockClient(LambdaClient);
  const [expectedSuccessSchedule] = expected.schedules;
  lambdaClientMock.on(InvokeCommand).resolves({
    StatusCode: 200,
    Payload: Uint8Array.from(
      JSON.stringify({
        scheduleId: expectedSuccessSchedule.scheduleId,
        success: true,
        result: expectedSuccessSchedule.result,
      }),
      x => x.charCodeAt(0),
    ),
  });
  documentClientMock.on(UpdateCommand).resolves({});
  const response = await dispatchTarget.handler();
  for (const scheduleId in response) {
    const schedule: ScheduleData = response[scheduleId];
    expect(schedule).toEqual({
      ...ScheduleSeeds.get(schedule.scheduleId),
      result: schedule.targetType === 'testA' ? schedule.result : { error: 'Target function not exists.' },
      status: schedule.targetType === 'testA' ? 'success' : 'unprocess',
    });
  }
  documentClientMock.restore();
  lambdaClientMock.restore();
});
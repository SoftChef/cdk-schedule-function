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
import scheduleSeeds from './seeds/schedule';

const expected = {
  schedules: scheduleSeeds,
};

test('Dispatch target success', async () => {
  const documentClientMock = mockClient(DynamoDBDocumentClient);
  documentClientMock.on(QueryCommand).resolves({
    Items: expected.schedules,
  });
  const lambdaClientMock = mockClient(LambdaClient);
  const [expectedSuccessSchedule] = expected.schedules;
  lambdaClientMock.on(InvokeCommand, {
    Payload: Buffer.from(
      JSON.stringify({
        scheduleId: `${expectedSuccessSchedule.scheduledAt}-${expectedSuccessSchedule.id}`,
        context: expectedSuccessSchedule.context,
      }),
      'utf-8',
    ),
  }).resolves({
    StatusCode: 200,
    Payload: Uint8Array.from(
      JSON.stringify({
        scheduleId: `${expectedSuccessSchedule.scheduledAt}-${expectedSuccessSchedule.id}`,
        success: true,
        result: expectedSuccessSchedule.result,
      }),
      x => x.charCodeAt(0),
    ),
  });
  documentClientMock.on(UpdateCommand).resolves({});
  const response = await dispatchTarget.handler();
  for (const schedule of expected.schedules) {
    const scheduleId = `${schedule.scheduledAt}-${schedule.id}`;
    expect(response[scheduleId]).toEqual({
      scheduledAt: schedule.scheduledAt,
      id: schedule.id,
      targetType: schedule.targetType,
      description: schedule.description,
      context: schedule.context,
      result: schedule.targetType === 'testA' ? schedule.result : { error: 'Target function not exists.' },
      status: schedule.targetType === 'testA' ? 'success' : 'unprocess',
      createdAt: schedule.createdAt,
    });
  }
  documentClientMock.restore();
  lambdaClientMock.restore();
});
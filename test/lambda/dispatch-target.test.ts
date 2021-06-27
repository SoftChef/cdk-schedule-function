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
import dayjs from 'dayjs';
import * as dispatchTarget from '../../lambda-assets/dispatch-target/app';
import { ScheduleData } from '../../lambda-assets/models/schedule-data';

const expected = {
  schedules: <ScheduleData[]> [
    {
      scheduledAt: dayjs().add(1, 'hour').format('YYYYMMDDHHmm'),
      id: 'uuuu-iiii-dddd-vvvv-4444',
      targetType: 'testA',
      context: { a: 1 },
      description: 'TestA',
      result: {
        created: true,
      },
      status: 'pending',
      createdAt: dayjs().valueOf(),
    },
    {
      scheduledAt: dayjs().add(1, 'hour').format('YYYYMMDDHHmm'),
      id: 'uuuu-iiii-dddd-vvvv-5555',
      targetType: 'testB',
      context: { b: 1 },
      description: 'TestB',
      result: {
        created: false,
      },
      status: 'pending',
      createdAt: dayjs().valueOf(),
    },
  ],
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
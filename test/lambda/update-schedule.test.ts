process.env.SCHEDULE_TABLE_NAME = 'cdk-schedule-function-demo-DemoScheduleFunctionScheduleTableD2070658-7VF8CDKMWMK2';

import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  mockClient,
} from 'aws-sdk-client-mock';
import * as updateSchedule from '../../lambda-assets/update-schedule/app';
import { ScheduleSeeds } from './seeds/schedule';

const expected = {
  schedule: ScheduleSeeds.one(),
};

test('Update schedule success', async () => {
  const documentClientMock = mockClient(DynamoDBDocumentClient);
  documentClientMock.on(GetCommand).resolves({
    Item: expected.schedule,
  });
  documentClientMock.on(UpdateCommand).resolves({});
  const response = await updateSchedule.handler({
    pathParameters: {
      scheduleId: expected.schedule.scheduleId,
    },
    body: {
      description: 'Test schedule',
      context: {
        document: {
          operation: 'test',
        },
      },
    },
  });
  const body = JSON.parse(response.body);
  expect(response.statusCode).toEqual(200);
  expect(body.updated).toEqual(true);
  documentClientMock.restore();
});

test('Update schedule with empty inputs extect failure', async () => {
  const response = await updateSchedule.handler({
    pathParameters: {
      scheduleId: expected.schedule.scheduleId,
    },
  });
  const body = JSON.parse(response.body);
  expect(response.statusCode).toEqual(422);
  expect(body.error).toEqual([
    {
      type: 'object',
      label: 'context',
      key: 'context',
      message: expect.any(String),
      value: null,
    },
  ]);
});

test('Update schedule with invalid inputs extect failure', async () => {
  const response = await updateSchedule.handler({
    pathParameters: {
      scheduleId: expected.schedule.scheduleId,
    },
    body: {
      description: 123,
      context: 456,
    },
  });
  const body = JSON.parse(response.body);
  expect(response.statusCode).toEqual(422);
  expect(body.error).toEqual([
    {
      label: 'description',
      key: 'description',
      message: expect.any(String),
      value: 123,
    },
    {
      type: 'object',
      label: 'context',
      key: 'context',
      message: expect.any(String),
      value: 456,
    },
  ]);
});

test('Update schedule with not exists scheduleId extect failure', async () => {
  const documentClientMock = mockClient(DynamoDBDocumentClient);
  documentClientMock.on(GetCommand).resolves({});
  const response = await updateSchedule.handler({
    pathParameters: {
      scheduleId: 'NotExistsScheduleId',
    },
    body: {
      description: 'Test schedule',
      context: {
        document: {
          operation: 'test',
        },
      },
    },
  });
  expect(response.statusCode).toEqual(404);
});
process.env.TARGET_FUNCTIONS_NAME = JSON.stringify({
  testA: 'TestA-Function',
  testB: 'TestB-Function',
});

import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import {
  mockClient,
} from 'aws-sdk-client-mock';
import dayjs from 'dayjs';
import * as createSchedule from '../../lambda-assets/create-schedule/app';

test('Create schedule success', async () => {
  const documentClientMock = mockClient(DynamoDBDocumentClient);
  documentClientMock.on(BatchWriteCommand).resolves({});
  const response = await createSchedule.handler({
    body: {
      targetType: 'testA',
      schedules: [
        dayjs().add(1, 'hour').valueOf(),
        dayjs().add(2, 'hour').valueOf(),
      ],
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
  expect(body.created).toEqual(true);
  documentClientMock.restore();
});

test('Create schedule with empty inputs extect failure', async () => {
  const response = await createSchedule.handler({});
  const body = JSON.parse(response.body);
  expect(response.statusCode).toEqual(422);
  expect(body.error).toEqual([
    {
      label: 'targetType',
      key: 'targetType',
      message: expect.any(String),
      valids: Object.keys(
        JSON.parse(process.env.TARGET_FUNCTIONS_NAME ?? '{}'),
      ),
      value: null,
    },
    {
      label: 'targetType',
      key: 'targetType',
      message: expect.any(String),
      value: null,
    },
    {
      label: 'schedules',
      key: 'schedules',
      message: expect.any(String),
      value: null,
    },
    {
      type: 'object',
      label: 'context',
      key: 'context',
      message: expect.any(String),
      value: null,
    },
  ]);
});

test('Create schedule with invalid inputs extect failure', async () => {
  const notExistsTargetType = 'NotExistsTargetType';
  const scheduledAt = dayjs().valueOf();
  const response = await createSchedule.handler({
    body: {
      targetType: notExistsTargetType,
      schedules: [
        scheduledAt,
        scheduledAt,
      ],
      description: 123,
      context: 456,
    },
  });
  const body = JSON.parse(response.body);
  expect(response.statusCode).toEqual(422);
  expect(body.error).toEqual([
    {
      label: 'targetType',
      key: 'targetType',
      message: expect.any(String),
      valids: Object.keys(
        JSON.parse(process.env.TARGET_FUNCTIONS_NAME ?? '{}'),
      ),
      value: notExistsTargetType,
    },
    {
      label: 'schedules[0]',
      key: 0,
      limit: expect.any(Number),
      message: expect.any(String),
      value: scheduledAt,
    },
    {
      label: 'schedules[1]',
      key: 1,
      limit: expect.any(Number),
      message: expect.any(String),
      value: scheduledAt,
    },
    {
      label: 'schedules[1]',
      key: 1,
      message: expect.any(String),
      dupePos: 0,
      dupeValue: scheduledAt,
      pos: 1,
      value: scheduledAt,
    },
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
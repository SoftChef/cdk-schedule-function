/**
 * @todo
 * Verify QueryCommand
 */

process.env.TARGET_FUNCTIONS_NAME = JSON.stringify({
  testA: 'TestA-Function',
});

import {
  QueryCommand,
  DynamoDBDocumentClient,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  mockClient,
} from 'aws-sdk-client-mock';
import * as listSchedules from '../../lambda-assets/list-schedules/app';
import { ScheduleSeeds } from './seeds/schedule';

const expected = {
  schedules: ScheduleSeeds.all(),
};

test('List schedules by targetType success', async () => {
  const documentClientMock = mockClient(DynamoDBDocumentClient);
  documentClientMock.on(QueryCommand).resolves({
    Items: expected.schedules,
  });
  const response = await listSchedules.handler({
    queryStringParameters: {
      targetType: 'testA',
    },
  });
  const body = JSON.parse(response.body);
  expect(response.statusCode).toEqual(200);
  expect(body.schedules).toEqual(expected.schedules);
  documentClientMock.restore();
});

test('List schedules all success', async () => {
  const documentClientMock = mockClient(DynamoDBDocumentClient);
  documentClientMock.on(ScanCommand).resolves({
    Items: expected.schedules,
  });
  const response = await listSchedules.handler({});
  const body = JSON.parse(response.body);
  expect(response.statusCode).toEqual(200);
  expect(body.schedules).toEqual(expected.schedules);
  documentClientMock.restore();
});
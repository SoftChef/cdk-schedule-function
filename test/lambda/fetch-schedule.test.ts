import {
  DynamoDBDocumentClient,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  mockClient,
} from 'aws-sdk-client-mock';
import * as fetchSchedule from '../../lambda-assets/fetch-schedule/app';
import { ScheduleSeeds } from './seeds/schedule';

const expected = {
  schedule: ScheduleSeeds.one(),
};

test('Fetch schedule success', async () => {
  const documentClientMock = mockClient(DynamoDBDocumentClient);
  documentClientMock.on(GetCommand).resolves({
    Item: expected.schedule,
  });
  const response = await fetchSchedule.handler({
    pathParameters: {
      scheduleId: expected.schedule.scheduleId,
    },
  });
  const body = JSON.parse(response.body);
  expect(response.statusCode).toEqual(200);
  expect(body.schedule).toEqual(expected.schedule);
  documentClientMock.restore();
});

test('Fetch schedule with not exists scheduleId extect failure', async () => {
  const documentClientMock = mockClient(DynamoDBDocumentClient);
  documentClientMock.on(GetCommand).resolves({});
  const response = await fetchSchedule.handler({
    pathParameters: {
      scheduleId: 'NotExistsScheduleId',
    },
  });
  expect(response.statusCode).toEqual(404);
});
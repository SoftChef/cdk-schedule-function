import {
  DynamoDBDocumentClient,
  GetCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  mockClient,
} from 'aws-sdk-client-mock';
import * as deleteSchedule from '../../lambda-assets/delete-schedule/app';
import { ScheduleSeeds } from './seeds/schedule';

const expected = {
  schedule: ScheduleSeeds.one(),
};

test('Delete schedule success', async () => {
  const documentClientMock = mockClient(DynamoDBDocumentClient);
  documentClientMock.on(GetCommand).resolves({
    Item: expected.schedule,
  });
  documentClientMock.on(DeleteCommand).resolves({});
  const response = await deleteSchedule.handler({
    pathParameters: {
      scheduleId: expected.schedule.scheduleId,
    },
  });
  const body = JSON.parse(response.body);
  expect(response.statusCode).toEqual(200);
  expect(body.deleted).toEqual(true);
  documentClientMock.restore();
});

test('Delete schedule with not exists scheduleId extect failure', async () => {
  const documentClientMock = mockClient(DynamoDBDocumentClient);
  documentClientMock.on(GetCommand).resolves({});
  const response = await deleteSchedule.handler({
    pathParameters: {
      scheduleId: 'NotExistsScheduleId',
    },
  });
  expect(response.statusCode).toEqual(404);
});
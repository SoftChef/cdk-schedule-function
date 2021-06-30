import {
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { Request, Response } from '@softchef/lambda-events';

const {
  SCHEDULE_TABLE_NAME,
} = process.env;

export async function handler(event: { [key: string]: any }) {
  const request = new Request(event);
  const response = new Response();
  try {
    const scheduleId: string = request.parameter('scheduleId');
    const ddbDocClient: DynamoDBDocumentClient = DynamoDBDocumentClient.from(
      new DynamoDBClient({}),
    );
    const { Item: schedule } = await ddbDocClient.send(
      new GetCommand({
        TableName: SCHEDULE_TABLE_NAME,
        Key: {
          scheduleId: scheduleId,
        },
      }),
    );
    if (!schedule) {
      return response.error('Not found.', 404);
    };
    await ddbDocClient.send(
      new DeleteCommand({
        TableName: SCHEDULE_TABLE_NAME,
        Key: {
          scheduleId: scheduleId,
        }
      }),
    );
    return response.json({
      deleted: true,
    });
  } catch (error) {
    return response.error(error);
  }
}
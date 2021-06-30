import {
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { Request, Response } from '@softchef/lambda-events';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import * as Joi from 'joi';

const {
  SCHEDULE_TABLE_NAME,
} = process.env;

dayjs.extend(utc);

export async function handler(event: { [key: string]: any }) {
  const request = new Request(event);
  const response = new Response();
  try {
    const validated = request.validate((joi: Joi.Root) => {
      const joiSchema: {
        [key: string]: Joi.Schema<any>;
      } = {
        description: joi.string().allow(null),
        context: joi.object().required(),
      };
      return joiSchema;
    });
    if (validated.error) {
      return response.error(validated.details, 422);
    }
    const scheduleId: string = request.parameter('scheduleId');
    const description: string = request.input('description', '');
    const context: { [key: string]: any } = request.input('context', {});
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
      new UpdateCommand({
        TableName: SCHEDULE_TABLE_NAME,
        Key: {
          scheduleId: scheduleId,
        },
        UpdateExpression: 'set #description = :description and #context = :context',
        ExpressionAttributeNames: {
          '#description': 'description',
          '#context': 'context',
        },
        ExpressionAttributeValues: {
          ':description': description,
          ':context': context,
        },
      }),
    );
    return response.json({
      updated: true,
    });
  } catch (error) {
    console.log(error);
    return response.error(error);
  }
}
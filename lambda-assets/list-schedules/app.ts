import {
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { Request, Response } from '@softchef/lambda-events';

const {
  SCHEDULE_TABLE_NAME,
  TARGET_FUNCTIONS_NAME,
  FIXED_TARGET_TYPE,
} = process.env;

export async function handler(event: { [key: string]: any }) {
  const request = new Request(event);
  const response = new Response();
  try {
    const targetTypes: {
      [key: string]: string;
    } = JSON.parse(TARGET_FUNCTIONS_NAME ?? '{}') ?? {};
    const fixedTargetType: string | null = typeof FIXED_TARGET_TYPE === 'string' && targetTypes[FIXED_TARGET_TYPE] ? FIXED_TARGET_TYPE : null;
    const ddbDocClient: DynamoDBDocumentClient = DynamoDBDocumentClient.from(
      new DynamoDBClient({}),
    );
    let parameters: {
      [key: string]: any;
    } = {};
    if (request.has('nextToken')) {
      parameters.ExclusiveStartKey = {
        Key: JSON.parse(
          Buffer.from(request.get('nextToken'), 'base64').toString('utf8'),
        ),
      };
    };
    let result = null;
    if (fixedTargetType !== null || request.has('targetType')) {
      result = await ddbDocClient.send(
        new QueryCommand({
          TableName: SCHEDULE_TABLE_NAME,
          IndexName: 'Query-By-TargetType',
          KeyConditionExpression: '#targetType = :targetType',
          ExpressionAttributeNames: {
            '#targetType': 'targetType',
          },
          ExpressionAttributeValues: {
            ':targetType': fixedTargetType ?? request.input('targetType'),
          },
          ...parameters,
        }),
      );
    } else {
      result = await ddbDocClient.send(
        new ScanCommand({
          TableName: SCHEDULE_TABLE_NAME,
          ...parameters,
        }),
      );
    }
    const { Items: schedules, LastEvaluatedKey: lastEvaluatedKey } = result;
    let nextToken = null;
    if (lastEvaluatedKey) {
      nextToken = Buffer.from(
        JSON.stringify(lastEvaluatedKey),
      ).toString('base64');
    }
    return response.json({
      schedules,
      nextToken,
    });
  } catch (error) {
    return response.error(error);
  }
}
import {
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import {
  InvokeCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ScheduleData } from '../models/schedule-data';

const {
  SCHEDULE_TABLE_NAME,
  TARGET_FUNCTIONS_NAME,
} = process.env;

dayjs.extend(utc);

export async function handler() {
  const ddbDocClient: DynamoDBDocumentClient = DynamoDBDocumentClient.from(
    new DynamoDBClient({}),
  );
  const schedules: {
    [key: string]: ScheduleData;
  } = {};
  const targetFunctionsName = JSON.parse(TARGET_FUNCTIONS_NAME ?? '{}');
  try {
    console.log('Query Params', {
      TableName: SCHEDULE_TABLE_NAME,
      KeyConditionExpression: '#scheduledAt = :scheduledAt',
      ExpressionAttributeNames: {
        '#scheduledAt': 'scheduledAt',
      },
      ExpressionAttributeValues: {
        ':scheduledAt': dayjs().utc().format('YYYYMMDDHHmm'),
      },
    });
    const { Items: items } = await ddbDocClient.send(
      new QueryCommand({
        TableName: SCHEDULE_TABLE_NAME,
        KeyConditionExpression: '#scheduledAt = :scheduledAt',
        ExpressionAttributeNames: {
          '#scheduledAt': 'scheduledAt',
        },
        ExpressionAttributeValues: {
          ':scheduledAt': dayjs().utc().format('YYYYMMDDHHmm'),
        },
      }),
    );
    console.log('Items', items);
    for (const item of items ?? []) {
      const scheduleId: string = `${item.scheduledAt}-${item.id}`;
      schedules[scheduleId] = {
        scheduledAt: item.scheduledAt,
        id: item.id,
        targetType: item.targetType,
        description: item.description,
        context: item.context,
        status: 'unprocess',
        createdAt: item.createdAt,
      };
    }
  } catch (error) {
    console.error('Query schedule error', error);
  }
  try {
    console.log('targetFunctionsName', targetFunctionsName);
    const lambdaClient: LambdaClient = new LambdaClient({});
    const invokes: Promise<any>[] = [];
    for (const scheduleId in schedules) {
      const schedule: ScheduleData = schedules[scheduleId];
      const targetFunctionName: string = targetFunctionsName[schedule.targetType] ?? null;
      if (!targetFunctionName) {
        schedule.result = {
          error: 'Target function not exists.',
        };
      }
      invokes.push(
        lambdaClient.send(
          new InvokeCommand({
            FunctionName: targetFunctionName,
            Payload: Buffer.from(
              JSON.stringify({
                scheduleId: scheduleId,
                context: schedule.context,
              }),
              'utf-8',
            ),
          }),
        ),
      );
    }
    const invokeAll = await Promise.all(invokes);
    for (const invoke of invokeAll) {
      const response = JSON.parse(
        String.fromCharCode.apply(null, invoke?.Payload ?? Uint8Array.from('{}', x => x.charCodeAt(0))),
      ) ?? {};
      if (typeof response === 'object' && schedules[response.scheduleId]) {
        schedules[response.scheduleId] = Object.assign(schedules[response.scheduleId], {
          status: response.success === true ? 'success' : 'failed',
          result: response.result ?? '',
        });
      }
    }
  } catch (error) {
    console.error('Invoke target function error', error);
  }
  try {
    console.log('schedules', schedules);
    for (const scheduleId in schedules) {
      const schedule: ScheduleData = schedules[scheduleId];
      await ddbDocClient.send(
        new UpdateCommand({
          TableName: SCHEDULE_TABLE_NAME,
          Key: {
            scheduledAt: schedule.scheduledAt,
            id: schedule.id,
          },
          UpdateExpression: 'SET #response = :response, #status = :status, #updatedAt = :updatedAt',
          ExpressionAttributeNames: {
            '#response': 'response',
            '#status': 'status',
            '#updatedAt': 'updatedAt',
          },
          ExpressionAttributeValues: {
            ':response': schedule.result,
            ':status': schedule.status,
            ':updatedAt': dayjs().valueOf(),
          },
        }),
      );
    }
  } catch (error) {
    console.error('Update schedule error', error);
  }
  return schedules;
}
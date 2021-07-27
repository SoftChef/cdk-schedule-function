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
import { ScheduleItem } from '../models/schedule-item';

const {
  SCHEDULE_TABLE_NAME,
  TARGET_FUNCTIONS_NAME,
} = process.env;

dayjs.extend(utc);

export async function handler() {
  const ddbDocClient: DynamoDBDocumentClient = DynamoDBDocumentClient.from(
    new DynamoDBClient({}),
  );
  const targetFunctionsName = JSON.parse(TARGET_FUNCTIONS_NAME ?? '{}');
  let schedules: {
    [key: string]: ScheduleItem;
  } = {};
  try {
    const { Items: items } = await ddbDocClient.send(
      new QueryCommand({
        TableName: SCHEDULE_TABLE_NAME,
        IndexName: 'Query-By-ScheduledAt',
        KeyConditionExpression: '#scheduledAt = :scheduledAt',
        ExpressionAttributeNames: {
          '#scheduledAt': 'scheduledAt',
        },
        ExpressionAttributeValues: {
          ':scheduledAt': dayjs().utc().format('YYYYMMDDHHmm'),
        },
      }),
    );
    for (const item of items ?? []) {
      schedules[item.scheduleId] = <ScheduleItem> {
        ...item,
        status: 'unprocess',
      };
    }
  } catch (error) {
    console.error('Query schedule error', error);
  }
  try {
    const lambdaClient: LambdaClient = new LambdaClient({});
    const invokes: Promise<any>[] = [];
    for (const scheduleId in schedules) {
      const schedule: ScheduleItem = schedules[scheduleId];
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
              JSON.stringify(schedule),
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
    for (const scheduleId in schedules) {
      const schedule: ScheduleItem = schedules[scheduleId];
      await ddbDocClient.send(
        new UpdateCommand({
          TableName: SCHEDULE_TABLE_NAME,
          Key: {
            scheduleId,
          },
          UpdateExpression: 'SET #response = :response, #status = :status, #updatedAt = :updatedAt',
          ExpressionAttributeNames: {
            '#response': 'response',
            '#status': 'status',
            '#updatedAt': 'updatedAt',
          },
          ExpressionAttributeValues: {
            ':response': schedule.result ?? {},
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
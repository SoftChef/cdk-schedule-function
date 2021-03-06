import * as crypto from 'crypto';
import {
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { Request, Response } from '@softchef/lambda-events';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import * as Joi from 'joi';
import {
  v4 as uuidv4,
} from 'uuid';
import { ScheduleItem } from '../models/schedule-item';

const {
  SCHEDULE_TABLE_NAME,
  TARGET_FUNCTIONS_NAME,
  RECENT_MINUTES,
  FIXED_TARGET_TYPE,
} = process.env;

dayjs.extend(utc);

export async function handler(event: { [key: string]: any }) {
  const request = new Request(event);
  const response = new Response();
  try {
    const targetTypes: {
      [key: string]: string;
    } = JSON.parse(TARGET_FUNCTIONS_NAME ?? '{}') ?? {};
    const fixedTargetType: string | null = typeof FIXED_TARGET_TYPE === 'string' && targetTypes[FIXED_TARGET_TYPE] ? FIXED_TARGET_TYPE : null;
    const recentMinutes = RECENT_MINUTES !== undefined ? parseInt(RECENT_MINUTES) : 5;
    const validated = request.validate((joi: Joi.Root) => {
      const joiSchema: {
        [key: string]: Joi.Schema<any>;
      } = {
        targetId: joi.string().allow(null),
        schedules: joi.array().unique().min(1).max(25).items(
          joi.number().min(
            dayjs().add(recentMinutes, 'minutes').valueOf(),
          ),
        ),
        description: joi.string().allow(null),
        context: joi.object().required(),
      };
      if (fixedTargetType === null) {
        joiSchema.targetType = joi.string().valid(...Object.keys(targetTypes)).required();
      }
      return joiSchema;
    });
    if (validated.error) {
      return response.error(validated.details, 422);
    }
    const targetType: string = request.input('targetType');
    const targetId: string = request.input('targetId', '');
    const description: string = request.input('description', '');
    const context: { [key: string]: any } = request.input('context', {});
    const schedules: ScheduleItem[] = request.input('schedules', []).map((timestamp: number): ScheduleItem => {
      const md5 = crypto.createHash('md5');
      const schedule: dayjs.Dayjs = dayjs(timestamp).utc();
      const scheduledAt = schedule.format('YYYYMMDDHHmm');
      const uuid = uuidv4();
      const scheduleItem: ScheduleItem = {
        scheduleId: md5.update(`${scheduledAt}-${uuid}`).digest('hex'),
        scheduledAt: scheduledAt,
        uuid: uuid,
        targetType: targetType,
        targetId: targetId,
        description: description,
        context: context,
        status: 'pending',
        createdAt: dayjs().valueOf(),
      };
      return scheduleItem;
    });
    const ddbDocClient: DynamoDBDocumentClient = DynamoDBDocumentClient.from(
      new DynamoDBClient({}),
    );
    await ddbDocClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [`${SCHEDULE_TABLE_NAME}`]: schedules.map((schedule: ScheduleItem) => {
            return {
              PutRequest: {
                Item: schedule,
              },
            };
          }),
        },
      }),
    );
    return response.json({
      created: true,
    });
  } catch (error) {
    return response.error(error);
  }
}
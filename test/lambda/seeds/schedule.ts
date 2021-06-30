import dayjs from 'dayjs';
import { ScheduleData } from '../../../lambda-assets/models/schedule-data';

const seeds = <ScheduleData[]> [
  {
    scheduledAt: dayjs().add(1, 'hour').format('YYYYMMDDHHmm'),
    uuid: 'uuuu-iiii-dddd-vvvv-4444',
    targetType: 'testA',
    context: { a: 1 },
    description: 'TestA',
    result: {
      created: true,
    },
    status: 'pending',
    createdAt: dayjs().valueOf(),
  },
  {
    scheduledAt: dayjs().add(1, 'hour').format('YYYYMMDDHHmm'),
    uuid: 'uuuu-iiii-dddd-vvvv-5555',
    targetType: 'testB',
    context: { b: 1 },
    description: 'TestB',
    result: {
      created: false,
    },
    status: 'pending',
    createdAt: dayjs().valueOf(),
  },
].map((schedule) => {
  return {
    ...schedule,
    scheduleId: `${schedule.scheduledAt}-${schedule.uuid}`,
  };
});

export class ScheduleSeeds {

  static all(): ScheduleData[] {
    return seeds;
  }

  static one(): ScheduleData {
    const random = Math.round(
      Math.random() * (1 - 0) + 0,
    );
    return <ScheduleData> seeds.splice(random, 1).pop();
  }

  static get(scheduleId: string): ScheduleData {
    return <ScheduleData> seeds.filter((schedule) => {
      return schedule.scheduleId === scheduleId;
    }).pop();
  }
};
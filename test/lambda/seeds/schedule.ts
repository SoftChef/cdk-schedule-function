import dayjs from 'dayjs';
import { ScheduleItem } from '../../../lambda-assets/models/schedule-item';

const seeds = <ScheduleItem[]> [
  {
    scheduledAt: dayjs().add(1, 'hour').format('YYYYMMDDHHmm'),
    uuid: 'uuuu-iiii-dddd-vvvv-4444',
    targetType: 'testA',
    targetId: 'testA-1',
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
    targetId: 'testB-1',
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

  static all(): ScheduleItem[] {
    return seeds;
  }

  static one(): ScheduleItem {
    const random = Math.round(
      Math.random() * (1 - 0) + 0,
    );
    return <ScheduleItem> seeds.splice(random, 1).pop();
  }

  static get(scheduleId: string): ScheduleItem {
    return <ScheduleItem> seeds.filter((schedule) => {
      return schedule.scheduleId === scheduleId;
    }).pop();
  }
};
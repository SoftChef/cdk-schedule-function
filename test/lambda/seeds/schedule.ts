import dayjs from 'dayjs';
import { ScheduleData } from '../../../lambda-assets/models/schedule-data';

export default <ScheduleData[]> [
  {
    scheduledAt: dayjs().add(1, 'hour').format('YYYYMMDDHHmm'),
    id: 'uuuu-iiii-dddd-vvvv-4444',
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
    id: 'uuuu-iiii-dddd-vvvv-5555',
    targetType: 'testB',
    context: { b: 1 },
    description: 'TestB',
    result: {
      created: false,
    },
    status: 'pending',
    createdAt: dayjs().valueOf(),
  },
];
export interface ScheduleItem {
  scheduleId: string;
  scheduledAt: string;
  uuid: string;
  targetType: string;
  targetId?: string;
  description?: string;
  context: any;
  status: string;
  result?: {
    [key: string]: any;
  };
  createdAt: number;
  updatedAt?: number;
}
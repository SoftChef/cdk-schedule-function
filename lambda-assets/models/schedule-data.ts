export interface ScheduleData {
  scheduleId: string;
  scheduledAt: string;
  uuid: string;
  targetType: string;
  description?: string;
  context: any;
  status: string;
  result?: {
    [key: string]: any;
  };
  createdAt: number;
  updatedAt?: number;
}
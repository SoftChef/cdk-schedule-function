export interface ScheduleData {
  scheduledAt: string;
  id: string;
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
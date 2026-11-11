import { Model, Document, Types } from 'mongoose';
import { QueryResult } from '../paginate/paginate';

export const chartTypes = ['pie', 'bar'] as const;
export type ChartType = (typeof chartTypes)[number];

export interface IStatistic {
  title: string;
  chartType: ChartType;
  source: string;
  compareBy: string;
  dateFrom?: Date;
  dateTo?: Date;
  createdBy: Types.ObjectId;
}

export interface IStatisticDoc extends IStatistic, Document {}

export interface IStatisticModel extends Model<IStatisticDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type NewCreatedStatistic = Omit<IStatistic, 'createdBy'>;

export interface IStatisticData {
  id: string;
  title: string;
  chartType: ChartType;
  source: string;
  compareBy: string;
  labels: string[];
  values: number[];
  total: number;
}

import httpStatus from 'http-status';
import mongoose from 'mongoose';
import Statistic from './statistic.model';
import ApiError from '../errors/ApiError';
import { IOptions, QueryResult } from '../paginate/paginate';
import { statisticSources } from './statistic.config';
import { IStatisticData, IStatisticDoc, NewCreatedStatistic } from './statistic.interfaces';

const NO_VALUE_LABEL = 'Sin valor';

const startOfUtcDay = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));

const endOfUtcDay = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));

/**
 * Create a statistic. Dates are stored as whole UTC days (inclusive range).
 * @param {NewCreatedStatistic} statisticBody
 * @param {mongoose.Types.ObjectId} createdBy
 * @returns {Promise<IStatisticDoc>}
 */
export const createStatistic = async (
  statisticBody: NewCreatedStatistic,
  createdBy: mongoose.Types.ObjectId
): Promise<IStatisticDoc> => {
  const body: NewCreatedStatistic = { ...statisticBody };
  if (body.dateFrom) body.dateFrom = startOfUtcDay(body.dateFrom);
  if (body.dateTo) body.dateTo = endOfUtcDay(body.dateTo);
  return Statistic.create({ ...body, createdBy });
};

/**
 * Query for statistics
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const queryStatistics = async (options: IOptions): Promise<QueryResult> => Statistic.paginate({}, options);

/**
 * Get statistic by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<IStatisticDoc | null>}
 */
export const getStatisticById = async (id: mongoose.Types.ObjectId): Promise<IStatisticDoc | null> =>
  Statistic.findById(id);

/**
 * Compute the chart data of a statistic, grouping its source by the compareBy field
 * within the statistic's date range. Known values are always included (count 0 if absent).
 * @param {IStatisticDoc} statistic
 * @returns {Promise<IStatisticData>}
 */
export const getStatisticData = async (statistic: IStatisticDoc): Promise<IStatisticData> => {
  const source = statisticSources[statistic.source];
  if (!source) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Unknown statistic source');
  }

  const match: Record<string, any> = {};
  if (statistic.dateFrom || statistic.dateTo) {
    match['createdAt'] = {};
    if (statistic.dateFrom) match['createdAt'].$gte = statistic.dateFrom;
    if (statistic.dateTo) match['createdAt'].$lte = statistic.dateTo;
  }

  const dimension = source.compareBy[statistic.compareBy];
  if (!dimension) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Unknown compareBy for source');
  }

  const rows: { _id: unknown; count: number }[] = await source.model.aggregate([
    { $match: match },
    { $group: { _id: dimension.groupBy, count: { $sum: 1 } } },
  ]);

  const knownLabels = dimension.knownLabels;
  const counts = new Map<string, number>(knownLabels.map((value) => [value, 0]));
  rows.forEach((row) => {
    const label =
      row._id === null || row._id === undefined
        ? NO_VALUE_LABEL
        : dimension.toLabel
        ? dimension.toLabel(row._id)
        : String(row._id);
    counts.set(label, (counts.get(label) ?? 0) + row.count);
  });

  const otherLabels = [...counts.keys()].filter((label) => !knownLabels.includes(label)).sort((a, b) => a.localeCompare(b));
  const labels = [...knownLabels, ...otherLabels];
  const values = labels.map((label) => counts.get(label) ?? 0);

  return {
    id: statistic.id,
    title: statistic.title,
    chartType: statistic.chartType,
    source: statistic.source,
    compareBy: statistic.compareBy,
    labels,
    values,
    total: values.reduce((sum, value) => sum + value, 0),
  };
};

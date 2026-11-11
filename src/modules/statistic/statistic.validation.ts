import Joi from 'joi';
import { objectId } from '../validate/custom.validation';
import { chartTypes } from './statistic.interfaces';
import { statisticSources } from './statistic.config';

const createStatisticBody = Joi.object({
  title: Joi.string().trim().max(120).required(),
  chartType: Joi.string()
    .valid(...chartTypes)
    .required(),
  source: Joi.string()
    .valid(...Object.keys(statisticSources))
    .required(),
  compareBy: Joi.string().required(),
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso(),
}).custom((value, helpers) => {
  const sourceConfig = statisticSources[value.source];
  if (sourceConfig && !Object.keys(sourceConfig.compareBy).includes(value.compareBy)) {
    return helpers.message({ custom: `compareBy "${value.compareBy}" is not valid for source "${value.source}"` });
  }
  if (value.dateFrom && value.dateTo && value.dateTo < value.dateFrom) {
    return helpers.message({ custom: 'dateTo must be greater than or equal to dateFrom' });
  }
  return value;
});

export const createStatistic = {
  body: createStatisticBody,
};

export const getStatistics = {
  query: Joi.object().keys({
    sortBy: Joi.string(),
    projectBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

export const getStatisticData = {
  params: Joi.object().keys({
    statisticId: Joi.string().custom(objectId),
  }),
};

import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import pick from '../utils/pick';
import { IOptions } from '../paginate/paginate';
import * as statisticService from './statistic.service';

export const createStatistic = catchAsync(async (req: Request, res: Response) => {
  const statistic = await statisticService.createStatistic(req.body, new mongoose.Types.ObjectId(req.user.id));
  res.status(httpStatus.CREATED).send(statistic);
});

export const getStatistics = catchAsync(async (req: Request, res: Response) => {
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  const result = await statisticService.queryStatistics(options);
  res.send(result);
});

export const getStatisticData = catchAsync(async (req: Request, res: Response) => {
  const statistic = await statisticService.getStatisticById(new mongoose.Types.ObjectId(req.params['statisticId']));
  if (!statistic) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Statistic not found');
  }
  const data = await statisticService.getStatisticData(statistic);
  res.send(data);
});

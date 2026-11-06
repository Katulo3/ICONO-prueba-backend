import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import pick from '../utils/pick';
import { IOptions } from '../paginate/paginate';
import * as productService from './product.service';

export const createProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req.body);
  res.status(httpStatus.CREATED).send(product);
});

export const getProducts = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['name', 'category']);
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  const result = await productService.queryProducts(filter, options);
  res.send(result);
});

export const getProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await productService.getProductById(new mongoose.Types.ObjectId(req.params['productId']));
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  res.send(product);
});

export const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await productService.updateProductById(new mongoose.Types.ObjectId(req.params['productId']), req.body);
  res.send(product);
});

export const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  await productService.deleteProductById(new mongoose.Types.ObjectId(req.params['productId']));
  res.status(httpStatus.NO_CONTENT).send();
});

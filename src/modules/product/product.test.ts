import mongoose from 'mongoose';
import request from 'supertest';
import httpStatus from 'http-status';
import moment from 'moment';
import config from '../../config/config';
import tokenTypes from '../token/token.types';
import * as tokenService from '../token/token.service';
import app from '../../app';
import setupTestDB from '../jest/setupTestDB';
import User from '../user/user.model';
import Product from './product.model';
import { NewCreatedProduct } from './product.interfaces';

setupTestDB();

const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');

const userOne = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Regular User',
  email: 'regular@example.com',
  password: 'password1',
  role: 'user',
  isEmailVerified: false,
};

const admin = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Admin User',
  email: 'admin@example.com',
  password: 'password1',
  role: 'admin',
  isEmailVerified: false,
};

const userOneAccessToken = tokenService.generateToken(userOne._id, accessTokenExpires, tokenTypes.ACCESS);
const adminAccessToken = tokenService.generateToken(admin._id, accessTokenExpires, tokenTypes.ACCESS);

const productOne = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Notebook',
  description: 'Ruled notebook, 200 pages',
  price: 3.5,
  category: 'stationery',
  stock: 25,
};

const productTwo = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Pen',
  description: 'Blue ink ballpoint pen',
  price: 1,
  category: 'stationery',
  stock: 100,
};

const productThree = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Headphones',
  description: 'Over-ear wired headphones',
  price: 45,
  category: 'electronics',
  stock: 5,
};

const insertUsers = async () => {
  await User.insertMany([userOne, admin]);
};

describe('Product routes', () => {
  describe('POST /v1/products', () => {
    let newProduct: NewCreatedProduct;

    beforeEach(() => {
      newProduct = {
        name: 'Stapler',
        description: 'Desk stapler, 20 sheets',
        price: 8.25,
        category: 'office',
        stock: 10,
      };
    });

    test('should return 201 and create a product if admin is authenticated', async () => {
      await insertUsers();

      const res = await request(app)
        .post('/v1/products')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(newProduct)
        .expect(httpStatus.CREATED);

      expect(res.body).toEqual({
        id: expect.anything(),
        name: newProduct.name,
        description: newProduct.description,
        price: newProduct.price,
        category: newProduct.category,
        stock: newProduct.stock,
      });

      const dbProduct = await Product.findById(res.body.id);
      expect(dbProduct).toBeDefined();
      expect(dbProduct?.name).toBe(newProduct.name);
    });

    test('should default stock to 0 when it is not provided', async () => {
      await insertUsers();
      delete (newProduct as Partial<NewCreatedProduct>).stock;

      const res = await request(app)
        .post('/v1/products')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(newProduct)
        .expect(httpStatus.CREATED);

      expect(res.body.stock).toBe(0);
    });

    test('should return 401 if no token is provided', async () => {
      await request(app).post('/v1/products').send(newProduct).expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 403 if a regular user tries to create a product', async () => {
      await insertUsers();

      await request(app)
        .post('/v1/products')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(newProduct)
        .expect(httpStatus.FORBIDDEN);
    });

    test('should return 400 if price is negative', async () => {
      await insertUsers();

      await request(app)
        .post('/v1/products')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ ...newProduct, price: -1 })
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 if a required field is missing', async () => {
      await insertUsers();
      delete (newProduct as Partial<NewCreatedProduct>).category;

      await request(app)
        .post('/v1/products')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(newProduct)
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('GET /v1/products', () => {
    test('should return 200 and paginated products for an authenticated user', async () => {
      await insertUsers();
      await Product.insertMany([productOne, productTwo, productThree]);

      const res = await request(app)
        .get('/v1/products')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(res.body).toEqual({
        results: expect.any(Array),
        page: 1,
        limit: 10,
        totalPages: 1,
        totalResults: 3,
      });
      expect(res.body.results[0]).toEqual({
        id: expect.anything(),
        name: expect.any(String),
        description: expect.any(String),
        price: expect.any(Number),
        category: expect.any(String),
        stock: expect.any(Number),
      });
    });

    test('should filter products by category', async () => {
      await insertUsers();
      await Product.insertMany([productOne, productTwo, productThree]);

      const res = await request(app)
        .get('/v1/products')
        .query({ category: 'stationery' })
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(res.body.totalResults).toBe(2);
      res.body.results.forEach((p: { category: string }) => expect(p.category).toBe('stationery'));
    });

    test('should limit and paginate results', async () => {
      await insertUsers();
      await Product.insertMany([productOne, productTwo, productThree]);

      const res = await request(app)
        .get('/v1/products')
        .query({ limit: 2, page: 2 })
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(res.body.results).toHaveLength(1);
      expect(res.body).toMatchObject({ page: 2, limit: 2, totalPages: 2, totalResults: 3 });
    });

    test('should return 401 if no token is provided', async () => {
      await request(app).get('/v1/products').send().expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /v1/products/:productId', () => {
    test('should return 200 and the product if it exists', async () => {
      await insertUsers();
      await Product.insertMany([productOne]);

      const res = await request(app)
        .get(`/v1/products/${productOne._id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(res.body).toEqual({
        id: productOne._id.toHexString(),
        name: productOne.name,
        description: productOne.description,
        price: productOne.price,
        category: productOne.category,
        stock: productOne.stock,
      });
    });

    test('should return 404 if product does not exist', async () => {
      await insertUsers();

      await request(app)
        .get(`/v1/products/${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.NOT_FOUND);
    });

    test('should return 400 if product id is not a valid ObjectId', async () => {
      await insertUsers();

      await request(app)
        .get('/v1/products/invalidId')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('PATCH /v1/products/:productId', () => {
    test('should return 200 and update the product if admin is authenticated', async () => {
      await insertUsers();
      await Product.insertMany([productOne]);
      const update = { price: 4, stock: 30 };

      const res = await request(app)
        .patch(`/v1/products/${productOne._id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(update)
        .expect(httpStatus.OK);

      expect(res.body).toMatchObject({ id: productOne._id.toHexString(), ...update });

      const dbProduct = await Product.findById(productOne._id);
      expect(dbProduct?.price).toBe(4);
      expect(dbProduct?.stock).toBe(30);
    });

    test('should return 403 if a regular user tries to update a product', async () => {
      await insertUsers();
      await Product.insertMany([productOne]);

      await request(app)
        .patch(`/v1/products/${productOne._id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send({ price: 4 })
        .expect(httpStatus.FORBIDDEN);
    });

    test('should return 400 if body is empty', async () => {
      await insertUsers();
      await Product.insertMany([productOne]);

      await request(app)
        .patch(`/v1/products/${productOne._id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({})
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 404 if product does not exist', async () => {
      await insertUsers();

      await request(app)
        .patch(`/v1/products/${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ price: 4 })
        .expect(httpStatus.NOT_FOUND);
    });
  });

  describe('DELETE /v1/products/:productId', () => {
    test('should return 204 and delete the product if admin is authenticated', async () => {
      await insertUsers();
      await Product.insertMany([productOne]);

      await request(app)
        .delete(`/v1/products/${productOne._id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(httpStatus.NO_CONTENT);

      const dbProduct = await Product.findById(productOne._id);
      expect(dbProduct).toBeNull();
    });

    test('should return 403 if a regular user tries to delete a product', async () => {
      await insertUsers();
      await Product.insertMany([productOne]);

      await request(app)
        .delete(`/v1/products/${productOne._id}`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.FORBIDDEN);
    });

    test('should return 404 if product does not exist', async () => {
      await insertUsers();

      await request(app)
        .delete(`/v1/products/${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(httpStatus.NOT_FOUND);
    });
  });
});

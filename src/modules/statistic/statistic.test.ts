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
import Product from '../product/product.model';
import Statistic from './statistic.model';

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

const products = [
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Notebook',
    description: 'Ruled notebook',
    price: 3.5,
    category: 'stationery',
    stock: 25,
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Pen',
    description: 'Blue ink pen',
    price: 1,
    category: 'stationery',
    stock: 100,
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Headphones',
    description: 'Wired headphones',
    price: 45,
    category: 'electronics',
    stock: 5,
  },
];

const roleStatistic = {
  title: 'Roles de usuarios',
  chartType: 'pie',
  source: 'users',
  compareBy: 'role',
};

describe('Statistic routes', () => {
  describe('POST /v1/statistics', () => {
    test('should return 201 and create a statistic when admin sends valid body', async () => {
      await User.insertMany([userOne, admin]);

      const res = await request(app)
        .post('/v1/statistics')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(roleStatistic)
        .expect(httpStatus.CREATED);

      expect(res.body).toMatchObject({ title: 'Roles de usuarios', chartType: 'pie', source: 'users', compareBy: 'role' });
      expect(res.body.createdBy).toBe(admin._id.toString());
    });

    test('should store dates as whole UTC days', async () => {
      await User.insertMany([admin]);

      const res = await request(app)
        .post('/v1/statistics')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ ...roleStatistic, chartType: 'bar', dateFrom: '2024-01-05', dateTo: '2024-01-10' })
        .expect(httpStatus.CREATED);

      expect(res.body.dateFrom).toBe('2024-01-05T00:00:00.000Z');
      expect(res.body.dateTo).toBe('2024-01-10T23:59:59.999Z');
    });

    test('should return 403 when user role tries to create a statistic', async () => {
      await User.insertMany([userOne]);

      await request(app)
        .post('/v1/statistics')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send(roleStatistic)
        .expect(httpStatus.FORBIDDEN);
    });

    test('should return 401 when no token is provided', async () => {
      await request(app).post('/v1/statistics').send(roleStatistic).expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 400 when chartType is not pie or bar', async () => {
      await User.insertMany([admin]);

      await request(app)
        .post('/v1/statistics')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ ...roleStatistic, chartType: 'line' })
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 when compareBy is not valid for the source', async () => {
      await User.insertMany([admin]);

      await request(app)
        .post('/v1/statistics')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ ...roleStatistic, source: 'products', compareBy: 'role' })
        .expect(httpStatus.BAD_REQUEST);
    });

    test('should return 400 when dateTo is before dateFrom', async () => {
      await User.insertMany([admin]);

      await request(app)
        .post('/v1/statistics')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ ...roleStatistic, dateFrom: '2024-02-10', dateTo: '2024-02-01' })
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('GET /v1/statistics', () => {
    test('should return 200 and the statistics for a user role', async () => {
      await User.insertMany([userOne, admin]);
      await Statistic.create({ ...roleStatistic, createdBy: admin._id });

      const res = await request(app)
        .get('/v1/statistics')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].title).toBe('Roles de usuarios');
    });
  });

  describe('GET /v1/statistics/:statisticId/data', () => {
    test('should group users by role and include known roles with zero counts', async () => {
      await User.insertMany([userOne, admin]);
      const statistic = await Statistic.create({ ...roleStatistic, createdBy: admin._id });

      const res = await request(app)
        .get(`/v1/statistics/${statistic._id}/data`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(res.body).toMatchObject({
        title: 'Roles de usuarios',
        chartType: 'pie',
        labels: ['user', 'admin'],
        values: [1, 1],
        total: 2,
      });
    });

    test('should group users by registration month and include all 12 months', async () => {
      await User.insertMany([userOne, admin]);
      await User.collection.updateOne({ _id: userOne._id }, { $set: { createdAt: new Date('2024-03-10T12:00:00.000Z') } });
      await User.collection.updateOne({ _id: admin._id }, { $set: { createdAt: new Date('2023-03-01T00:00:00.000Z') } });
      const statistic = await Statistic.create({
        title: 'Registros por mes',
        chartType: 'bar',
        source: 'users',
        compareBy: 'registered',
        createdBy: admin._id,
      });

      const res = await request(app)
        .get(`/v1/statistics/${statistic._id}/data`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(res.body.labels).toHaveLength(12);
      expect(res.body.labels[0]).toBe('Enero');
      expect(res.body.labels[2]).toBe('Marzo');
      expect(res.body.values).toEqual([0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      expect(res.body.total).toBe(2);
    });

    test('should group products by category', async () => {
      await User.insertMany([userOne, admin]);
      await Product.insertMany(products);
      const statistic = await Statistic.create({
        title: 'Categorías',
        chartType: 'bar',
        source: 'products',
        compareBy: 'category',
        createdBy: admin._id,
      });

      const res = await request(app)
        .get(`/v1/statistics/${statistic._id}/data`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(res.body.labels).toEqual(['electronics', 'stationery']);
      expect(res.body.values).toEqual([1, 2]);
      expect(res.body.total).toBe(3);
    });

    test('should only count documents inside the date range', async () => {
      await User.insertMany([userOne, admin]);
      const statistic = await Statistic.create({
        ...roleStatistic,
        dateFrom: new Date('2000-01-01T00:00:00.000Z'),
        dateTo: new Date('2000-01-02T23:59:59.999Z'),
        createdBy: admin._id,
      });

      const res = await request(app)
        .get(`/v1/statistics/${statistic._id}/data`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(httpStatus.OK);

      expect(res.body.labels).toEqual(['user', 'admin']);
      expect(res.body.values).toEqual([0, 0]);
      expect(res.body.total).toBe(0);
    });

    test('should return 404 when the statistic does not exist', async () => {
      await User.insertMany([userOne]);
      await request(app)
        .get(`/v1/statistics/${new mongoose.Types.ObjectId()}/data`)
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.NOT_FOUND);
    });

    test('should return 400 when the id is invalid', async () => {
      await User.insertMany([userOne]);
      await request(app)
        .get('/v1/statistics/invalid-id/data')
        .set('Authorization', `Bearer ${userOneAccessToken}`)
        .send()
        .expect(httpStatus.BAD_REQUEST);
    });
  });
});

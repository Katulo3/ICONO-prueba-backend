import express, { Router } from 'express';
import { validate } from '../../modules/validate';
import { auth } from '../../modules/auth';
import { statisticController, statisticValidation } from '../../modules/statistic';

const router: Router = express.Router();

router
  .route('/')
  .post(auth('manageStatistics'), validate(statisticValidation.createStatistic), statisticController.createStatistic)
  .get(auth('getStatistics'), validate(statisticValidation.getStatistics), statisticController.getStatistics);

router
  .route('/:statisticId/data')
  .get(auth('getStatistics'), validate(statisticValidation.getStatisticData), statisticController.getStatisticData);

export default router;

/**
 * @swagger
 * tags:
 *   name: Statistics
 *   description: Saved charts computed from users or products
 */

/**
 * @swagger
 * /statistics:
 *   post:
 *     summary: Create a statistic
 *     description: Only admins can create statistics. Dates are whole UTC days and the range is inclusive.
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - chartType
 *               - source
 *               - compareBy
 *             properties:
 *               title:
 *                 type: string
 *               chartType:
 *                 type: string
 *                 enum: [pie, bar]
 *               source:
 *                 type: string
 *                 enum: [users, products]
 *               compareBy:
 *                 type: string
 *                 description: users -> role or registered (mes de registro), products -> category
 *               dateFrom:
 *                 type: string
 *                 format: date
 *               dateTo:
 *                 type: string
 *                 format: date
 *             example:
 *               title: Roles de usuarios
 *               chartType: pie
 *               source: users
 *               compareBy: role
 *     responses:
 *       "201":
 *         description: Created
 *       "400":
 *         description: Invalid body
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all statistics
 *     description: Any authenticated user can list statistics.
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: sort by query in the form of field:desc/asc (ex. title:asc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Maximum number of statistics
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *     responses:
 *       "200":
 *         description: OK
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /statistics/{id}/data:
 *   get:
 *     summary: Get the chart data of a statistic
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Statistic id
 *     responses:
 *       "200":
 *         description: OK. Returns labels, values and total.
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

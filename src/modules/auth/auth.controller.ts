import httpStatus from 'http-status';
import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { tokenService } from '../token';
import { userService } from '../user';
import * as authService from './auth.service';
import { emailService } from '../email';
import { ApiError } from '../errors';
import { clearAuthCookies, REFRESH_TOKEN_COOKIE, setAuthCookies } from './auth.cookies';

export const register = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.registerUser(req.body);
  const tokens = await tokenService.generateAuthTokens(user);
  setAuthCookies(res, tokens);
  res.status(httpStatus.CREATED).send({ user });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);
  setAuthCookies(res, tokens);
  res.send({ user });
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
  clearAuthCookies(res);
  if (refreshToken) {
    await authService.logout(refreshToken);
  }
  res.status(httpStatus.NO_CONTENT).send();
});

export const refreshTokens = catchAsync(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
  if (!refreshToken) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
  const { user, tokens } = await authService.refreshAuth(refreshToken);
  setAuthCookies(res, tokens);
  res.send({ user });
});

export const me = catchAsync(async (req: Request, res: Response) => {
  res.send({ user: req.user });
});

export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
  await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
  res.status(httpStatus.NO_CONTENT).send();
});

export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  await authService.resetPassword(req.query['token'], req.body.password);
  res.status(httpStatus.NO_CONTENT).send();
});

export const sendVerificationEmail = catchAsync(async (req: Request, res: Response) => {
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(req.user);
  await emailService.sendVerificationEmail(req.user.email, verifyEmailToken, req.user.name);
  res.status(httpStatus.NO_CONTENT).send();
});

export const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  await authService.verifyEmail(req.query['token']);
  res.status(httpStatus.NO_CONTENT).send();
});

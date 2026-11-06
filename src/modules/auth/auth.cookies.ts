import { Response } from 'express';
import config from '../../config/config';
import { AccessAndRefreshTokens } from '../token/token.interfaces';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

// The refresh token is only sent to the auth endpoints, never to the rest of the API.
const REFRESH_TOKEN_PATH = '/v1/auth';

export const setAuthCookies = (res: Response, tokens: AccessAndRefreshTokens): void => {
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.access.token, {
    ...config.jwt.cookieOptions,
    path: '/',
    expires: tokens.access.expires,
  });
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refresh.token, {
    ...config.jwt.cookieOptions,
    path: REFRESH_TOKEN_PATH,
    expires: tokens.refresh.expires,
  });
};

export const clearAuthCookies = (res: Response): void => {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { ...config.jwt.cookieOptions, path: '/' });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { ...config.jwt.cookieOptions, path: REFRESH_TOKEN_PATH });
};

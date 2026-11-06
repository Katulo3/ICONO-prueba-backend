import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';
import { Request } from 'express';
import tokenTypes from '../token/token.types';
import config from '../../config/config';
import User from '../user/user.model';
import { IPayload } from '../token/token.interfaces';
import { ACCESS_TOKEN_COOKIE } from './auth.cookies';

const accessTokenFromCookie = (req: Request): string | null => req.cookies?.[ACCESS_TOKEN_COOKIE] ?? null;

const jwtStrategy = new JwtStrategy(
  {
    secretOrKey: config.jwt.secret,
    jwtFromRequest: ExtractJwt.fromExtractors([accessTokenFromCookie, ExtractJwt.fromAuthHeaderAsBearerToken()]),
  },
  async (payload: IPayload, done) => {
    try {
      if (payload.type !== tokenTypes.ACCESS) {
        throw new Error('Invalid token type');
      }
      const user = await User.findById(payload.sub);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      done(error, false);
    }
  }
);

export default jwtStrategy;

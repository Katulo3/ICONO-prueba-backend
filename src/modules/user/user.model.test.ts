import { faker } from '@faker-js/faker';
import { NewCreatedUser } from './user.interfaces';
import User from './user.model';

describe('User model', () => {
  describe('User validation', () => {
    let newUser: NewCreatedUser;
    beforeEach(() => {
      newUser = {
        name: faker.name.findName(),
        email: faker.internet.email().toLowerCase(),
        password: 'password1',
        role: 'user',
      };
    });

    test('should correctly validate a valid user', async () => {
      await expect(new User(newUser).validate()).resolves.toBeUndefined();
    });

    test('should throw a validation error if email is invalid', async () => {
      newUser.email = 'invalidEmail';
      await expect(new User(newUser).validate()).rejects.toThrow();
    });

    test('should throw a validation error if password length is less than 4 characters', async () => {
      newUser.password = 'abc';
      await expect(new User(newUser).validate()).rejects.toThrow();
    });

    test('should accept a 4-character password without letters and numbers requirement', async () => {
      newUser.password = '1234';
      await expect(new User(newUser).validate()).resolves.toBeUndefined();
    });

    test('should throw a validation error if role is unknown', async () => {
      newUser.role = 'invalid';
      await expect(new User(newUser).validate()).rejects.toThrow();
    });
  });

  describe('User toJSON()', () => {
    test('should not return user password when toJSON is called', () => {
      const newUser = {
        name: faker.name.findName(),
        email: faker.internet.email().toLowerCase(),
        password: 'password1',
        role: 'user',
      };
      expect(new User(newUser).toJSON()).not.toHaveProperty('password');
    });
  });
});

import * as bcrypt from 'bcrypt';

export function comparePassword(
  password: string,
  passwordHashed: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHashed);
}

export function hashPassword(password: string): Promise<string> {
  const saltOrRounds = 12;
  return bcrypt.hash(password, saltOrRounds);
}

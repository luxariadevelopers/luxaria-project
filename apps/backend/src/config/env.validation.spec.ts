import 'reflect-metadata';
import { validateEnvironment } from './env.validation';

describe('validateEnvironment', () => {
  const base = {
    MONGODB_URI: 'mongodb://127.0.0.1:27017/test',
    JWT_ACCESS_SECRET: 'dev-access-secret-at-least-32-chars!!',
    JWT_REFRESH_SECRET: 'dev-refresh-secret-at-least-32-chars!',
    FIELD_ENCRYPTION_KEY: 'dev-field-encryption-key-32bytes!!',
  };

  it('allows development defaults when secrets omitted', () => {
    const env = validateEnvironment({
      NODE_ENV: 'development',
      MONGODB_URI: base.MONGODB_URI,
    });
    expect(env.JWT_ACCESS_SECRET).toContain('luxaria-dev');
  });

  it('rejects production with default secrets', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        MONGODB_URI: base.MONGODB_URI,
        CORS_ORIGINS: 'https://app.luxaria.test',
        JWT_ACCESS_SECRET: 'luxaria-dev-access-secret-change-me',
        JWT_REFRESH_SECRET: base.JWT_REFRESH_SECRET,
        FIELD_ENCRYPTION_KEY: base.FIELD_ENCRYPTION_KEY,
      }),
    ).toThrow(/development default secrets/);
  });

  it('requires CORS_ORIGINS in production and rejects *', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        ...base,
      }),
    ).toThrow(/CORS_ORIGINS/);

    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        ...base,
        CORS_ORIGINS: '*',
      }),
    ).toThrow(/\*/);
  });

  it('accepts production with strong secrets and allowlisted CORS', () => {
    const env = validateEnvironment({
      NODE_ENV: 'production',
      ...base,
      CORS_ORIGINS: 'https://app.luxaria.test,https://admin.luxaria.test',
      SWAGGER_ENABLED: 'false',
    });
    expect(env.NODE_ENV).toBe('production');
    expect(env.SWAGGER_ENABLED).toBe(false);
  });
});

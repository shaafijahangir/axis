// Stub for jose@6 (ESM-only) so Jest's CJS transform can import modules
// that transitively depend on jose (e.g. lti.service.ts) without crashing.

export const jwtVerify = jest.fn();
export const createLocalJWKSet = jest.fn();
export const createRemoteJWKSet = jest.fn();
export const SignJWT = jest.fn().mockImplementation(() => ({
  setProtectedHeader: jest.fn().mockReturnThis(),
  setIssuedAt: jest.fn().mockReturnThis(),
  setExpirationTime: jest.fn().mockReturnThis(),
  sign: jest.fn().mockResolvedValue('mock-jwt'),
}));
export const importPKCS8 = jest.fn();
export const importSPKI = jest.fn();
export const generateKeyPair = jest.fn();
export const exportSPKI = jest.fn();
export const exportPKCS8 = jest.fn();

export type JWTPayload = Record<string, unknown>;
export type JSONWebKeySet = { keys: unknown[] };

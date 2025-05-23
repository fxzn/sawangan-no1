import { verifyGoogleToken } from '../src/utils/google-oauth.js';
import { OAuth2Client } from 'google-auth-library';

// Mock environment variables
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';

// Mock the entire google-auth-library module
jest.mock('google-auth-library', () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => ({
      verifyIdToken: jest.fn().mockImplementation(() => ({
        getPayload: jest.fn()
      }))
    }))
  };
});

describe('Google OAuth Utility', () => {
  let mockVerifyIdToken;
  let mockGetPayload;
  let consoleSpy;

  beforeEach(() => {
    // Get the mock instance
    const mockClient = new OAuth2Client();
    mockVerifyIdToken = mockClient.verifyIdToken;
    mockGetPayload = mockVerifyIdToken().getPayload;
    
    // Setup console spies
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  it('should successfully verify a valid Google token', async () => {
    // Mock payload data
    const mockPayload = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      picture: 'https://avatar.url',
      email_verified: true
    };

    // Setup mock responses
    mockGetPayload.mockReturnValue(mockPayload);

    const token = 'valid-google-token';
    const result = await verifyGoogleToken(token);

    // Verify OAuth2Client initialization
    expect(OAuth2Client).toHaveBeenCalledWith({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret'
    });

    // Verify token verification
    expect(mockVerifyIdToken).toHaveBeenCalledWith({
      idToken: token,
      audience: [
        'test-client-id',
        '407408718192.apps.googleusercontent.com'
      ]
    });

    // Verify returned data
    expect(result).toEqual({
      name: 'John Doe',
      email: 'john.doe@example.com',
      picture: 'https://avatar.url'
    });

    // Verify logging
    expect(consoleSpy.log).toHaveBeenCalledWith(
      'Verifying token for client ID:',
      'test-client-id'
    );
    expect(consoleSpy.log).toHaveBeenCalledWith(
      'Token payload:',
      mockPayload
    );
  });

  it('should throw error for unverified Google account', async () => {
    const mockPayload = {
      email_verified: false
    };

    mockGetPayload.mockReturnValue(mockPayload);

    await expect(verifyGoogleToken('valid-token'))
      .rejects.toThrow('Google account not verified');
  });

  it('should handle verification errors with proper error message', async () => {
    const testError = new Error('Token verification failed');
    mockVerifyIdToken.mockRejectedValue(testError);

    await expect(verifyGoogleToken('invalid-token'))
      .rejects.toThrow('Invalid Google token: Token verification failed');
      
    expect(consoleSpy.error).toHaveBeenCalledWith(
      'Full verification error:',
      expect.objectContaining({
        message: 'Token verification failed'
      })
    );
  });

  it('should log verification error details', async () => {
    const testError = new Error('Test error');
    testError.stack = 'error stack trace';
    mockVerifyIdToken.mockRejectedValue(testError);

    try {
      await verifyGoogleToken('invalid-token');
    } catch (error) {
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Full verification error:',
        {
          message: 'Test error',
          stack: 'error stack trace'
        }
      );
    }
  });
});
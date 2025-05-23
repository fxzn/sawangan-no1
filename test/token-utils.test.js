import * as tokenUtils from '../src/utils/token-utils.js';
import bcrypt from 'bcrypt';

describe('Token Utilities', () => {
  describe('generateResetToken', () => {
    it('should generate a random hex string of 64 characters', () => {
      const token = tokenUtils.generateResetToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes = 64 hex characters
    });

    it('should generate different tokens each time', () => {
      const token1 = tokenUtils.generateResetToken();
      const token2 = tokenUtils.generateResetToken();
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('hashToken', () => {
    it('should return a hashed token', async () => {
      const testToken = 'test-token-123';
      const hashedToken = await tokenUtils.hashToken(testToken);
      
      expect(hashedToken).toBeDefined();
      expect(typeof hashedToken).toBe('string');
      expect(hashedToken).not.toBe(testToken);
    });

    it('should produce different hashes for same input (due to salt)', async () => {
      const testToken = 'test-token-123';
      const hash1 = await tokenUtils.hashToken(testToken);
      const hash2 = await tokenUtils.hashToken(testToken);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('compareTokens', () => {
    it('should return true for matching tokens', async () => {
      const testToken = 'test-token-123';
      const hashedToken = await bcrypt.hash(testToken, 10);
      
      const result = await tokenUtils.compareTokens(testToken, hashedToken);
      expect(result).toBe(true);
    });

    it('should return false for non-matching tokens', async () => {
      const testToken = 'test-token-123';
      const wrongToken = 'wrong-token-456';
      const hashedToken = await bcrypt.hash(testToken, 10);
      
      const result = await tokenUtils.compareTokens(wrongToken, hashedToken);
      expect(result).toBe(false);
    });

    it('should handle empty or invalid tokens', async () => {
      const testToken = 'test-token-123';
      const hashedToken = await bcrypt.hash(testToken, 10);
      
      await expect(tokenUtils.compareTokens('', hashedToken))
        .resolves.toBe(false);
      await expect(tokenUtils.compareTokens(null, hashedToken))
        .resolves.toBe(false);
      await expect(tokenUtils.compareTokens(undefined, hashedToken))
        .resolves.toBe(false);
    });
  });
});
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

// Base64 encoding function that works in React Native
function base64Encode(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let i = 0;
  
  while (i < str.length) {
    const a = str.charCodeAt(i++);
    const b = i < str.length ? str.charCodeAt(i++) : Number.NaN;
    const c = i < str.length ? str.charCodeAt(i++) : Number.NaN;
    
    const bitmap = (a << 16) | (b << 8) | c;
    
    output += chars.charAt((bitmap >> 18) & 63);
    output += chars.charAt((bitmap >> 12) & 63);
    output += chars.charAt(isNaN(b) ? 64 : (bitmap >> 6) & 63);
    output += chars.charAt(isNaN(c) ? 64 : bitmap & 63);
  }
  
  return output;
}

// Enable browser session completion on iOS
WebBrowser.maybeCompleteAuthSession();

const FITBIT_CLIENT_ID = process.env.EXPO_PUBLIC_FITBIT_CLIENT_ID || '';
const FITBIT_CLIENT_SECRET = process.env.EXPO_PUBLIC_FITBIT_CLIENT_SECRET || '';

// OAuth endpoints
const discovery = {
  authorizationEndpoint: 'https://www.fitbit.com/oauth2/authorize',
  tokenEndpoint: 'https://api.fitbit.com/oauth2/token',
  revocationEndpoint: 'https://api.fitbit.com/oauth2/revoke',
};

// Secure storage keys
const FITBIT_TOKEN_KEY = 'fitbit_access_token';
const FITBIT_REFRESH_TOKEN_KEY = 'fitbit_refresh_token';
const FITBIT_EXPIRES_AT_KEY = 'fitbit_expires_at';

export interface FitbitTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface FitbitActivityData {
  steps: number;
  calories: number;
  distance: number;
  activeMinutes: number;
  floors: number;
}

export interface FitbitHeartRateData {
  restingHeartRate: number;
  heartRateZones: Array<{
    name: string;
    min: number;
    max: number;
    minutes: number;
  }>;
}

export interface FitbitSleepData {
  duration: number; // in minutes
  efficiency: number;
  minutesAsleep: number;
  minutesAwake: number;
  timeInBed: number;
}

class FitbitService {
  private redirectUri: string;

  constructor() {
    // For web, Fitbit requires the exact redirect URI without path
    // For native, use custom scheme with path
    if (Platform.OS === 'web') {
      // Use base URL without any path for web OAuth
      const baseUrl = process.env.EXPO_PUBLIC_APP_URL || 'http://localhost:8081';
      this.redirectUri = baseUrl.replace(/\/$/, ''); // Remove trailing slash if present
    } else {
      this.redirectUri = AuthSession.makeRedirectUri({
        scheme: 'lifeflow',
        path: 'auth/fitbit-callback',
      });
    }
    
  }

  /**
   * Generate PKCE code verifier (43-128 characters, URL-safe)
   */
  private generateCodeVerifier(): string {
    // Use only alphanumeric characters to avoid any encoding issues
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = 64; // Use 64 characters (within 43-128 range)
    let verifier = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      verifier += chars[randomIndex];
    }
    
    return verifier;
  }

  /**
   * Generate PKCE code challenge from verifier
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    // Convert string to Uint8Array
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    
    // Hash with SHA256
    const hashArray = await Crypto.digest(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data
    );
    
    // Convert ArrayBuffer to base64
    const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(hashArray)));
    
    // Convert to URL-safe base64
    return hashBase64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Initiate Fitbit OAuth flow
   */
  async authorize(): Promise<FitbitTokens | null> {
    try {
      // Generate PKCE code verifier (43-128 characters, URL-safe)
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      
      const authRequest = new AuthSession.AuthRequest({
        clientId: FITBIT_CLIENT_ID,
        scopes: ['activity', 'heartrate', 'sleep', 'profile'],
        redirectUri: this.redirectUri,
        responseType: AuthSession.ResponseType.Code,
        extraParams: {
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        },
      });

      const result = await authRequest.promptAsync(discovery);

      if (result.type === 'success') {
        const { code } = result.params;
        
        // Exchange code for tokens with code verifier
        const tokens = await this.exchangeCodeForTokens(code, codeVerifier);
        
        if (tokens) {
          await this.saveTokens(tokens);
          return tokens;
        }
      }

      return null;
    } catch (error) {
      console.error('Fitbit authorization error:', error);
      throw error;
    }
  }

  /**
   * Exchange authorization code for access tokens
   */
  private async exchangeCodeForTokens(
    code: string,
    codeVerifier: string
  ): Promise<FitbitTokens | null> {
    try {
      // Fitbit requires Basic Authentication header
      const credentials = `${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`;
      const base64Credentials = base64Encode(credentials);
      
      const formBody = [
        `code=${encodeURIComponent(code)}`,
        `grant_type=authorization_code`,
        `redirect_uri=${encodeURIComponent(this.redirectUri)}`,
        `code_verifier=${codeVerifier}`, // Don't encode - PKCE verifiers are already URL-safe
      ].join('&');

      const response = await fetch(discovery.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${base64Credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: formBody,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      };
    } catch (error) {
      console.error('Token exchange error:', error);
      return null;
    }
  }

  /**
   * Save tokens to secure storage
   */
  private async saveTokens(tokens: FitbitTokens): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(FITBIT_TOKEN_KEY, tokens.accessToken);
      localStorage.setItem(FITBIT_REFRESH_TOKEN_KEY, tokens.refreshToken);
      localStorage.setItem(FITBIT_EXPIRES_AT_KEY, tokens.expiresAt.toString());
    } else {
      await SecureStore.setItemAsync(FITBIT_TOKEN_KEY, tokens.accessToken);
      await SecureStore.setItemAsync(FITBIT_REFRESH_TOKEN_KEY, tokens.refreshToken);
      await SecureStore.setItemAsync(FITBIT_EXPIRES_AT_KEY, tokens.expiresAt.toString());
    }
  }

  /**
   * Get stored tokens
   */
  async getTokens(): Promise<FitbitTokens | null> {
    try {
      let accessToken: string | null;
      let refreshToken: string | null;
      let expiresAt: string | null;

      if (Platform.OS === 'web') {
        accessToken = localStorage.getItem(FITBIT_TOKEN_KEY);
        refreshToken = localStorage.getItem(FITBIT_REFRESH_TOKEN_KEY);
        expiresAt = localStorage.getItem(FITBIT_EXPIRES_AT_KEY);
      } else {
        accessToken = await SecureStore.getItemAsync(FITBIT_TOKEN_KEY);
        refreshToken = await SecureStore.getItemAsync(FITBIT_REFRESH_TOKEN_KEY);
        expiresAt = await SecureStore.getItemAsync(FITBIT_EXPIRES_AT_KEY);
      }

      if (!accessToken || !refreshToken || !expiresAt) {
        return null;
      }

      return {
        accessToken,
        refreshToken,
        expiresAt: parseInt(expiresAt, 10),
      };
    } catch (error) {
      console.error('Error getting Fitbit tokens:', error);
      return null;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<FitbitTokens | null> {
    try {
      const tokens = await this.getTokens();
      if (!tokens) return null;

      const credentials = `${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`;
      const base64Credentials = base64Encode(credentials);

      const formBody = [
        `grant_type=refresh_token`,
        `refresh_token=${encodeURIComponent(tokens.refreshToken)}`,
      ].join('&');

      const response = await fetch(discovery.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${base64Credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody,
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();

      const newTokens: FitbitTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      };

      await this.saveTokens(newTokens);
      return newTokens;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  private async getValidAccessToken(): Promise<string | null> {
    let tokens = await this.getTokens();
    
    if (!tokens) return null;

    // Check if token is expired or will expire in the next 5 minutes
    if (tokens.expiresAt < Date.now() + 5 * 60 * 1000) {
      tokens = await this.refreshAccessToken();
      if (!tokens) return null;
    }

    return tokens.accessToken;
  }

  /**
   * Fetch today's activity data
   */
  async getTodayActivity(): Promise<FitbitActivityData | null> {
    try {
      const accessToken = await this.getValidAccessToken();
      if (!accessToken) return null;

      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(
        `https://api.fitbit.com/1/user/-/activities/date/${today}.json`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch activity data: ${response.statusText}`);
      }

      const data = await response.json();
      const summary = data.summary;

      return {
        steps: summary.steps || 0,
        calories: summary.caloriesOut || 0,
        distance: summary.distances?.[0]?.distance || 0,
        activeMinutes: summary.fairlyActiveMinutes + summary.veryActiveMinutes || 0,
        floors: summary.floors || 0,
      };
    } catch (error) {
      console.error('Error fetching Fitbit activity data:', error);
      return null;
    }
  }

  /**
   * Fetch today's heart rate data
   */
  async getTodayHeartRate(): Promise<FitbitHeartRateData | null> {
    try {
      const accessToken = await this.getValidAccessToken();
      if (!accessToken) return null;

      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(
        `https://api.fitbit.com/1/user/-/activities/heart/date/${today}/1d.json`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch heart rate data: ${response.statusText}`);
      }

      const data = await response.json();
      const heartData = data['activities-heart']?.[0];

      if (!heartData) return null;

      return {
        restingHeartRate: heartData.value?.restingHeartRate || 0,
        heartRateZones: heartData.value?.heartRateZones || [],
      };
    } catch (error) {
      console.error('Error fetching Fitbit heart rate data:', error);
      return null;
    }
  }

  /**
   * Fetch today's sleep data
   */
  async getTodaySleep(): Promise<FitbitSleepData | null> {
    try {
      const accessToken = await this.getValidAccessToken();
      if (!accessToken) return null;

      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(
        `https://api.fitbit.com/1.2/user/-/sleep/date/${today}.json`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch sleep data: ${response.statusText}`);
      }

      const data = await response.json();
      const sleep = data.sleep?.[0];

      if (!sleep) return null;

      return {
        duration: sleep.duration / 60000, // Convert ms to minutes
        efficiency: sleep.efficiency || 0,
        minutesAsleep: sleep.minutesAsleep || 0,
        minutesAwake: sleep.minutesAwake || 0,
        timeInBed: sleep.timeInBed || 0,
      };
    } catch (error) {
      console.error('Error fetching Fitbit sleep data:', error);
      return null;
    }
  }

  /**
   * Check if user is connected to Fitbit
   */
  async isConnected(): Promise<boolean> {
    const tokens = await this.getTokens();
    return tokens !== null;
  }

  /**
   * Disconnect from Fitbit (revoke tokens and clear storage)
   */
  async disconnect(): Promise<void> {
    try {
      const tokens = await this.getTokens();
      
      if (tokens) {
        // Revoke the token
        const credentials = `${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`;
        const base64Credentials = base64Encode(credentials);
        
        const formBody = `token=${encodeURIComponent(tokens.accessToken)}`;

        await fetch(discovery.revocationEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${base64Credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formBody,
        });
      }

      // Clear stored tokens
      if (Platform.OS === 'web') {
        localStorage.removeItem(FITBIT_TOKEN_KEY);
        localStorage.removeItem(FITBIT_REFRESH_TOKEN_KEY);
        localStorage.removeItem(FITBIT_EXPIRES_AT_KEY);
      } else {
        await SecureStore.deleteItemAsync(FITBIT_TOKEN_KEY);
        await SecureStore.deleteItemAsync(FITBIT_REFRESH_TOKEN_KEY);
        await SecureStore.deleteItemAsync(FITBIT_EXPIRES_AT_KEY);
      }
    } catch (error) {
      console.error('Error disconnecting from Fitbit:', error);
      throw error;
    }
  }
}

export const fitbitService = new FitbitService();

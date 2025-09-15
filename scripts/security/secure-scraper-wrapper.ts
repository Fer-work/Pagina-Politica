/**
 * Secure Scraper Wrapper
 * Handles all security aspects of data collection
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import axios, { AxiosRequestConfig } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import fs from 'fs/promises';
import crypto from 'crypto';

const execAsync = promisify(exec);

export interface SecurityConfig {
  useVPN: boolean;
  useTor: boolean;
  useProxyRotation: boolean;
  maxRequestsPerHour: number;
  minDelayBetweenRequests: number;
  maxDelayBetweenRequests: number;
  userAgentRotation: boolean;
  emergencyStopFile: string;
}

export interface ProxyConfig {
  type: 'http' | 'https' | 'socks5';
  host: string;
  port: number;
  auth?: {
    username: string;
    password: string;
  };
}

export class SecureScraperWrapper {
  private config: SecurityConfig;
  private currentProxy: ProxyConfig | null = null;
  private requestCount: number = 0;
  private sessionStartTime: number = Date.now();
  private emergencyMode: boolean = false;

  private userAgents = [
    // Linux Chrome
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    // Linux Firefox
    'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0',
    'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/118.0',
    // Linux Edge
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0'
  ];

  private proxies: ProxyConfig[] = [
    // Tor SOCKS5 proxy
    { type: 'socks5', host: '127.0.0.1', port: 9050 },
    // Add your additional proxies here
  ];

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      useVPN: true,
      useTor: true,
      useProxyRotation: true,
      maxRequestsPerHour: 20, // Very conservative
      minDelayBetweenRequests: 30000, // 30 seconds minimum
      maxDelayBetweenRequests: 180000, // 3 minutes maximum
      userAgentRotation: true,
      emergencyStopFile: '/tmp/politica-mex-emergency-stop',
      ...config
    };
  }

  /**
   * Initialize secure session
   */
  async initializeSecureSession(): Promise<boolean> {
    console.log('🛡️ Initializing secure scraping session...');

    try {
      // Check for emergency stop
      if (await this.checkEmergencyStop()) {
        console.log('🚨 Emergency stop file detected. Aborting session.');
        return false;
      }

      // Verify VPN connection
      if (this.config.useVPN) {
        const vpnStatus = await this.checkVPNConnection();
        if (!vpnStatus) {
          console.log('❌ VPN connection required but not detected.');
          return false;
        }
        console.log('✅ VPN connection verified');
      }

      // Verify Tor connection
      if (this.config.useTor) {
        const torStatus = await this.checkTorConnection();
        if (!torStatus) {
          console.log('❌ Tor connection required but not available.');
          return false;
        }
        console.log('✅ Tor connection verified');
      }

      // Rotate identity
      await this.rotateIdentity();

      console.log('✅ Secure session initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize secure session:', error);
      return false;
    }
  }

  /**
   * Make a secure HTTP request
   */
  async secureRequest(url: string, options: Partial<AxiosRequestConfig> = {}): Promise<any> {
    // Check emergency stop before each request
    if (await this.checkEmergencyStop()) {
      throw new Error('Emergency stop activated');
    }

    // Check rate limiting
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded');
    }

    // Wait for random delay
    await this.randomDelay();

    // Configure request
    const config = await this.buildSecureRequestConfig(url, options);

    try {
      console.log(`🔒 Making secure request to: ${this.maskUrl(url)}`);
      const response = await axios(config);

      this.requestCount++;
      await this.logRequest(url, response.status);

      return response;

    } catch (error: any) {
      await this.logError(url, error);

      // Check for detection signals
      if (this.isDetectionError(error)) {
        await this.handleDetection(error);
      }

      throw error;
    }
  }

  /**
   * Check if VPN is connected
   */
  private async checkVPNConnection(): Promise<boolean> {
    try {
      // Get current IP
      const response = await axios.get('https://ifconfig.me/ip', { timeout: 10000 });
      const currentIP = response.data.trim();

      // Simple check: if IP is not in common residential ranges
      // This is basic - in production you'd check against your known home IP
      const isResidential =
        currentIP.startsWith('192.168.') ||
        currentIP.startsWith('10.') ||
        currentIP.startsWith('172.');

      return !isResidential;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if Tor is working
   */
  private async checkTorConnection(): Promise<boolean> {
    try {
      const agent = new SocksProxyAgent('socks5://127.0.0.1:9050');
      const response = await axios.get('https://check.torproject.org/api/ip', {
        httpsAgent: agent,
        timeout: 15000
      });

      return response.data.IsTor === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Rotate digital identity
   */
  private async rotateIdentity(): Promise<void> {
    console.log('🔄 Rotating digital identity...');

    try {
      // Rotate MAC address (requires sudo)
      await execAsync('sudo ~/politica-mex/scripts/security/rotate-identity.sh');

      // Rotate proxy if using proxy rotation
      if (this.config.useProxyRotation) {
        this.currentProxy = this.getRandomProxy();
      }

      // Small delay for changes to take effect
      await this.delay(5000);

    } catch (error) {
      console.warn('⚠️ Identity rotation failed (may need manual intervention):', error);
    }
  }

  /**
   * Build secure request configuration
   */
  private async buildSecureRequestConfig(url: string, options: Partial<AxiosRequestConfig>): Promise<AxiosRequestConfig> {
    const config: AxiosRequestConfig = {
      url,
      method: options.method || 'GET',
      timeout: 30000,
      headers: {
        'User-Agent': this.getRandomUserAgent(),
        'Accept': 'application/json, text/html, */*',
        'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
        ...options.headers
      },
      ...options
    };

    // Add proxy configuration
    if (this.config.useTor || this.currentProxy) {
      const proxy = this.currentProxy || this.proxies[0]; // Default to Tor

      if (proxy.type === 'socks5') {
        config.httpsAgent = new SocksProxyAgent(`${proxy.type}://${proxy.host}:${proxy.port}`);
        config.httpAgent = new SocksProxyAgent(`${proxy.type}://${proxy.host}:${proxy.port}`);
      } else {
        const proxyUrl = proxy.auth
          ? `${proxy.type}://${proxy.auth.username}:${proxy.auth.password}@${proxy.host}:${proxy.port}`
          : `${proxy.type}://${proxy.host}:${proxy.port}`;

        config.httpsAgent = new HttpsProxyAgent(proxyUrl);
      }
    }

    return config;
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(): boolean {
    const hoursSinceStart = (Date.now() - this.sessionStartTime) / (1000 * 60 * 60);
    const maxRequests = this.config.maxRequestsPerHour * Math.max(1, Math.ceil(hoursSinceStart));

    return this.requestCount < maxRequests;
  }

  /**
   * Random delay between requests
   */
  private async randomDelay(): Promise<void> {
    const min = this.config.minDelayBetweenRequests;
    const max = this.config.maxDelayBetweenRequests;
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;

    console.log(`⏱️ Waiting ${delay/1000}s before next request...`);
    await this.delay(delay);
  }

  /**
   * Get random user agent
   */
  private getRandomUserAgent(): string {
    if (!this.config.userAgentRotation) {
      return this.userAgents[0];
    }

    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * Get random proxy
   */
  private getRandomProxy(): ProxyConfig {
    return this.proxies[Math.floor(Math.random() * this.proxies.length)];
  }

  /**
   * Check for emergency stop file
   */
  private async checkEmergencyStop(): Promise<boolean> {
    try {
      await fs.access(this.config.emergencyStopFile);
      this.emergencyMode = true;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Log request for monitoring
   */
  private async logRequest(url: string, status: number): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      url: this.maskUrl(url),
      status,
      requestCount: this.requestCount,
      sessionDuration: Date.now() - this.sessionStartTime
    };

    const logDir = './logs';
    await fs.mkdir(logDir, { recursive: true });
    await fs.appendFile(`${logDir}/secure-requests.log`, JSON.stringify(logEntry) + '\n');
  }

  /**
   * Log errors for analysis
   */
  private async logError(url: string, error: any): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      url: this.maskUrl(url),
      error: {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      },
      requestCount: this.requestCount
    };

    const logDir = './logs';
    await fs.mkdir(logDir, { recursive: true });
    await fs.appendFile(`${logDir}/secure-errors.log`, JSON.stringify(logEntry) + '\n');
  }

  /**
   * Check if error indicates detection
   */
  private isDetectionError(error: any): boolean {
    const detectionSignals = [
      403, // Forbidden
      429, // Too Many Requests
      503, // Service Unavailable
      'ECONNRESET',
      'ETIMEDOUT'
    ];

    return detectionSignals.some(signal =>
      error.response?.status === signal ||
      error.code === signal ||
      error.message?.includes(signal.toString())
    );
  }

  /**
   * Handle potential detection
   */
  private async handleDetection(error: any): Promise<void> {
    console.log('🚨 Potential detection signal detected!');
    console.log(`Error: ${error.message}`);

    // Create emergency stop file
    await fs.writeFile(this.config.emergencyStopFile,
      `Emergency stop activated at ${new Date().toISOString()}\nReason: ${error.message}`
    );

    // Rotate identity immediately
    await this.rotateIdentity();

    // Extended delay
    console.log('⏸️ Entering extended cooling-off period...');
    await this.delay(600000); // 10 minutes
  }

  /**
   * Mask URL for logging (remove sensitive parts)
   */
  private maskUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    } catch {
      return url.substring(0, 50) + '...';
    }
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🛡️ Shutting down secure session...');

    // Run cleanup script
    try {
      await execAsync('~/politica-mex/scripts/security/secure-cleanup.sh');
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.warn('⚠️ Cleanup script failed:', error);
    }

    // Log session summary
    const sessionSummary = {
      duration: Date.now() - this.sessionStartTime,
      totalRequests: this.requestCount,
      averageDelay: (this.config.minDelayBetweenRequests + this.config.maxDelayBetweenRequests) / 2,
      emergencyStops: this.emergencyMode ? 1 : 0
    };

    console.log('📊 Session Summary:', sessionSummary);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Emergency stop utility
export class EmergencyStop {
  static async activate(reason: string = 'Manual activation'): Promise<void> {
    const stopFile = '/tmp/politica-mex-emergency-stop';
    await fs.writeFile(stopFile, `Emergency stop: ${reason}\nTime: ${new Date().toISOString()}`);
    console.log('🚨 Emergency stop activated!');
  }

  static async deactivate(): Promise<void> {
    const stopFile = '/tmp/politica-mex-emergency-stop';
    try {
      await fs.unlink(stopFile);
      console.log('✅ Emergency stop deactivated');
    } catch {
      console.log('ℹ️ Emergency stop was not active');
    }
  }

  static async isActive(): Promise<boolean> {
    const stopFile = '/tmp/politica-mex-emergency-stop';
    try {
      await fs.access(stopFile);
      return true;
    } catch {
      return false;
    }
  }
}
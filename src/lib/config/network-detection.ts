// Enhanced network detection for LAN + Internet dual access
// This would be added to your DRMS PWA

interface NetworkEndpoints {
  lan: string;
  wan: string;
  current: string;
}

interface NetworkInfo {
  isOnLAN: boolean;
  isOnline: boolean;
  endpoint: string;
  connectionType: 'lan' | 'wan' | 'offline';
}

export class NetworkDetector {
  private static instance: NetworkDetector;
  private endpoints: NetworkEndpoints;
  private currentNetworkInfo: NetworkInfo;
  private detectionInterval?: NodeJS.Timeout;

  private constructor() {
    // Get endpoints from environment or defaults
    this.endpoints = {
      lan: process.env.NEXT_PUBLIC_LAN_API_URL || 'http://192.168.1.100:3000/api',
      wan: process.env.NEXT_PUBLIC_API_URL || '/api',  // Current default
      current: '/api'  // Start with relative (works for both)
    };

    this.currentNetworkInfo = {
      isOnLAN: false,
      isOnline: navigator.onLine,
      endpoint: this.endpoints.current,
      connectionType: 'offline'
    };
  }

  static getInstance(): NetworkDetector {
    if (!NetworkDetector.instance) {
      NetworkDetector.instance = new NetworkDetector();
    }
    return NetworkDetector.instance;
  }

  /**
   * Detect if device is on the disaster response LAN
   * Method 1: Try to reach local server directly
   */
  async detectLANConnection(): Promise<boolean> {
    try {
      // Try to reach local server health endpoint
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000); // 2 second timeout

      const response = await fetch(`${this.endpoints.lan}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' }
      });

      clearTimeout(timeout);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Detect if internet connection is available
   * Method 2: Check if we can reach internet endpoints
   */
  async detectInternetConnection(): Promise<boolean> {
    try {
      if (!navigator.onLine) return false;

      // For relative URLs, test current domain
      if (this.endpoints.wan.startsWith('/')) {
        const response = await fetch('/api/health', {
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache' }
        });
        return response.ok;
      }

      // For absolute URLs, test direct connection
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.endpoints.wan}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' }
      });

      clearTimeout(timeout);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Determine best endpoint to use
   */
  async detectBestEndpoint(): Promise<NetworkInfo> {
    console.log('🔍 Detecting network configuration...');

    // Test LAN and WAN simultaneously
    const [isLANAvailable, isWANAvailable] = await Promise.all([
      this.detectLANConnection(),
      this.detectInternetConnection()
    ]);

    let networkInfo: NetworkInfo;

    if (isLANAvailable) {
      // LAN has priority (faster, local)
      networkInfo = {
        isOnLAN: true,
        isOnline: true,
        endpoint: this.endpoints.lan,
        connectionType: 'lan'
      };
      console.log('✅ LAN connection detected - using local server');
    } else if (isWANAvailable) {
      // Fallback to internet
      networkInfo = {
        isOnLAN: false,
        isOnline: true,
        endpoint: this.endpoints.wan,
        connectionType: 'wan'
      };
      console.log('✅ Internet connection detected - using remote server');
    } else {
      // Offline
      networkInfo = {
        isOnLAN: false,
        isOnline: false,
        endpoint: this.endpoints.current, // Keep last known
        connectionType: 'offline'
      };
      console.log('❌ No network connection - operating offline');
    }

    this.currentNetworkInfo = networkInfo;
    return networkInfo;
  }

  /**
   * Get current network information
   */
  getCurrentNetworkInfo(): NetworkInfo {
    return { ...this.currentNetworkInfo };
  }

  /**
   * Get API endpoint based on current network
   */
  getAPIEndpoint(): string {
    return this.currentNetworkInfo.endpoint;
  }

  /**
   * Start automatic network detection
   */
  startNetworkMonitoring(intervalMs: number = 30000): void {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
    }

    // Initial detection
    this.detectBestEndpoint();

    // Periodic detection
    this.detectionInterval = setInterval(async () => {
      const previousConnectionType = this.currentNetworkInfo.connectionType;
      await this.detectBestEndpoint();

      // Notify if connection type changed
      if (previousConnectionType !== this.currentNetworkInfo.connectionType) {
        console.log(`🔄 Network changed: ${previousConnectionType} → ${this.currentNetworkInfo.connectionType}`);
        
        // Trigger sync if we came online
        if (this.currentNetworkInfo.isOnline && previousConnectionType === 'offline') {
          // You would trigger sync here
          console.log('🔄 Triggering sync after network restoration');
        }
      }
    }, intervalMs);
  }

  /**
   * Stop network monitoring
   */
  stopNetworkMonitoring(): void {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = undefined;
    }
  }

  /**
   * Manual network refresh
   */
  async refreshNetworkStatus(): Promise<NetworkInfo> {
    return await this.detectBestEndpoint();
  }
}

// Enhanced fetch wrapper that uses network detection
export async function smartFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const detector = NetworkDetector.getInstance();
  const networkInfo = detector.getCurrentNetworkInfo();

  // If we have absolute path, use as-is
  if (path.startsWith('http')) {
    return fetch(path, options);
  }

  // For relative paths, determine best endpoint
  const endpoint = detector.getAPIEndpoint();
  const fullUrl = endpoint.endsWith('/') ? `${endpoint}${path.replace('/', '')}` : `${endpoint}${path}`;

  console.log(`🌐 API call via ${networkInfo.connectionType}: ${fullUrl}`);

  try {
    return await fetch(fullUrl, options);
  } catch (error) {
    console.error(`❌ API call failed on ${networkInfo.connectionType}:`, error);
    
    // Auto-retry with alternative endpoint if available
    if (networkInfo.connectionType === 'lan') {
      console.log('🔄 Retrying via internet...');
      await detector.refreshNetworkStatus();
      const fallbackEndpoint = detector.getAPIEndpoint();
      const fallbackUrl = fallbackEndpoint.endsWith('/') ? `${fallbackEndpoint}${path.replace('/', '')}` : `${fallbackEndpoint}${path}`;
      return await fetch(fallbackUrl, options);
    }
    
    throw error;
  }
}

// Export singleton instance
export const networkDetector = NetworkDetector.getInstance();
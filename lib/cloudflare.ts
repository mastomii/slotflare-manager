export interface CloudflareZone {
  id: string;
  name: string;
  status: string;
}

export interface CloudflareRoute {
  id: string;
  pattern: string;
  script: string;
}

export class CloudflareAPI {
  private apiToken: string;
  private accountId: string;

  constructor(apiToken: string, accountId: string) {
    this.apiToken = apiToken;
    this.accountId = accountId;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`https://api.cloudflare.com/client/v4${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[CloudflareAPI] ERROR:', {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        errorBody,
      });
      throw new Error(`Cloudflare API error: ${response.status} - ${errorBody}`);
    }

    return response.json();
  }

  async getZones(name?: string): Promise<CloudflareZone[]> {
    const params = name ? `?name=${name}` : '';
    const data = await this.request(`/zones${params}`);
    return data.result || [];
  }

  async deployScript(scriptName: string, scriptContent: string) {
    const response = await this.request(`/accounts/${this.accountId}/workers/scripts/${scriptName}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/javascript',
        'Authorization': `Bearer ${this.apiToken}`,
      },
      body: scriptContent,
    });
    return response;
  }

  async createRoute(zoneId: string, pattern: string, scriptName: string) {
    const response = await this.request(`/zones/${zoneId}/workers/routes`, {
      method: 'POST',
      body: JSON.stringify({
        pattern,
        script: scriptName,
      }),
    });
    return response;
  }

  async deleteRoute(zoneId: string, routeId: string) {
    const response = await this.request(`/zones/${zoneId}/workers/routes/${routeId}`, {
      method: 'DELETE',
    });
    return response;
  }

  async updateRoute(zoneId: string, routeId: string, pattern: string, scriptName: string) {
    const response = await this.request(`/zones/${zoneId}/workers/routes/${routeId}`, {
      method: 'PUT',
      body: JSON.stringify({
        pattern,
        script: scriptName,
      }),
    });
    return response;
  }

  async getRoutes(zoneId: string): Promise<CloudflareRoute[]> {
    const data = await this.request(`/zones/${zoneId}/workers/routes`);
    return data.result || [];
  }

  async deleteScript(scriptName: string) {
    const response = await this.request(`/accounts/${this.accountId}/workers/scripts/${scriptName}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
      },
    });
    return response;
  }
}
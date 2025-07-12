export interface WorkerTemplateData {
    scriptName: string;
    keywords: string[];
    whitelistPaths: string[];
    enableAlert: boolean;
    baseUrl?: string;
  }
  
  export function generateWorkerTemplate(data: WorkerTemplateData): string {
    const { scriptName, keywords, whitelistPaths, enableAlert, baseUrl } = data;
    
    const alertUrl = baseUrl || process.env.NEXTAUTH_URL || 'https://slotflare.vercel.app';
    
    return `addEventListener('fetch', event => {
      event.respondWith(handleRequest(event.request, event));
  });
  
  async function handleRequest(request, event) {
      const url = new URL(request.url);
      const path = url.pathname;
  
      const whitelistPaths = [${(whitelistPaths || []).map(p => `'${p}'`).join(', ')}];
      const forbiddenKeywords = [${(keywords || []).map(k => `'${k}'`).join(', ')}];
  
      if (whitelistPaths.includes(path)) {
          return fetch(request);
      }
  
      const response = await fetch(request);
      const responseClone = response.clone();
      const contentType = response.headers.get('Content-Type') || '';
  
      let body;
  
      try {
          if (contentType.includes('application/json')) {
              body = await responseClone.json();
          } else if (contentType.includes('text')) {
              body = await responseClone.text();
          } else {
              return response;
          }
      } catch (err) {
          console.error('Failed to parse response body:', err);
          return response;
      }
  
      let containsForbidden = false;
  
      if (typeof body === 'string') {
          const lowerBody = body.toLowerCase();
          containsForbidden = forbiddenKeywords.some(keyword =>
              lowerBody.includes(keyword.toLowerCase())
          );
      } else if (typeof body === 'object') {
          const bodyString = JSON.stringify(body).toLowerCase();
          containsForbidden = forbiddenKeywords.some(keyword =>
              bodyString.includes(keyword.toLowerCase())
          );
      }
  
      if (containsForbidden) {
          ${enableAlert ? `
          const detectedKeywords = forbiddenKeywords.filter(keyword =>
              typeof body === 'string'
                  ? body.toLowerCase().includes(keyword.toLowerCase())
                  : JSON.stringify(body).toLowerCase().includes(keyword.toLowerCase())
          );
  
          const alertData = {
              fullPath: request.url,
              time: new Date().toISOString(),
              sourceIP: request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown',
              responseCode: 403,
              scriptName: '${scriptName}',
              detectedKeywords: detectedKeywords
          };
  
          // Kirim alert secara paralel, tapi pastikan Worker tidak menghentikan sebelum selesai
          event.waitUntil(
              fetch('${alertUrl}/api/trigger', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(alertData)
              })
              .then(res => res.text().then(text => {
                  console.log('ALERT RESPONSE', res.status, text);
              }))
              .catch(err => {
                  console.error('Alert trigger failed:', err);
              })
          );` : ''}
  
          return new Response('Forbidden: Content blocked.', { status: 403 });
      }
  
      return response;
  }`;
  }
  
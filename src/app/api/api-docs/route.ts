import { type NextRequest, NextResponse } from 'next/server';

// Pinned versions - update together when upgrading
const SWAGGER_UI_VERSION = '5.17.14';
const CDN = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_UI_VERSION}`;

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const specUrl = `${origin}/api/openapi.json`;

  const html = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CyberRisk Canvas - API Docs</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡️</text></svg>" />
  <link rel="stylesheet" href="${CDN}/swagger-ui.css" />
  <style>
    *, *::before, *::after { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f0e0c;
      color: #e8e4de;
    }

    /* ── Top bar ── */
    .api-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 24px;
      background: #1a1714;
      border-bottom: 1px solid #2d2926;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .api-header-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      background: #4f46e5;
      border-radius: 10px;
      font-size: 18px;
    }
    .api-header-title { font-size: 15px; font-weight: 600; color: #fff; }
    .api-header-badge {
      margin-left: auto;
      font-size: 11px;
      font-weight: 600;
      background: #1e1c3a;
      color: #818cf8;
      border: 1px solid #3730a3;
      border-radius: 20px;
      padding: 2px 10px;
      letter-spacing: .04em;
    }
    .api-header-back {
      font-size: 12px;
      color: #9b9590;
      text-decoration: none;
      padding: 4px 10px;
      border: 1px solid #2d2926;
      border-radius: 6px;
      transition: background .15s;
    }
    .api-header-back:hover { background: #2d2926; color: #e8e4de; }

    /* ── Swagger UI overrides ── */
    #swagger-ui { max-width: 1100px; margin: 0 auto; padding: 0 24px 80px; }

    .swagger-ui .topbar { display: none !important; }

    .swagger-ui { color: #c9c4be; }
    .swagger-ui .info .title { color: #f5f0ea; font-size: 28px; }
    .swagger-ui .info p,
    .swagger-ui .info li,
    .swagger-ui .info td { color: #9b9590; }
    .swagger-ui .info code { background: #1a1714; color: #a5b4fc; border-radius: 4px; padding: 1px 5px; }

    .swagger-ui .opblock-tag { color: #e8e4de; border-bottom-color: #2d2926; }
    .swagger-ui .opblock-tag:hover { background: #1a1714 !important; }

    .swagger-ui .opblock { border-color: #2d2926 !important; background: #1a1714 !important; }
    .swagger-ui .opblock .opblock-summary-method { border-radius: 4px; font-weight: 700; }
    .swagger-ui .opblock .opblock-summary { border-color: #2d2926; }
    .swagger-ui .opblock-summary-description { color: #9b9590; }

    .swagger-ui .opblock.opblock-post   { border-left: 3px solid #3b82f6 !important; }
    .swagger-ui .opblock.opblock-get    { border-left: 3px solid #22c55e !important; }
    .swagger-ui .opblock.opblock-patch  { border-left: 3px solid #f59e0b !important; }
    .swagger-ui .opblock.opblock-delete { border-left: 3px solid #ef4444 !important; }

    .swagger-ui .opblock-body-inner,
    .swagger-ui .opblock-description-wrapper { background: #0f0e0c; }

    .swagger-ui .tab li { color: #9b9590; }
    .swagger-ui .tab li.active { color: #f5f0ea; }

    .swagger-ui input[type=text],
    .swagger-ui textarea,
    .swagger-ui select {
      background: #1a1714 !important;
      border-color: #3d3a36 !important;
      color: #e8e4de !important;
    }

    .swagger-ui .btn { border-radius: 6px !important; }
    .swagger-ui .btn.authorize {
      background: #4f46e5 !important;
      border-color: #4f46e5 !important;
      color: #fff !important;
    }
    .swagger-ui .btn.execute {
      background: #1a1714 !important;
      border-color: #4f46e5 !important;
      color: #818cf8 !important;
    }
    .swagger-ui .btn.execute:hover { background: #4f46e5 !important; color: #fff !important; }

    .swagger-ui .response-col_status { color: #22c55e; }
    .swagger-ui table thead tr th { color: #9b9590; border-bottom-color: #2d2926; }
    .swagger-ui .model-box { background: #1a1714; }
    .swagger-ui .model { color: #c9c4be; }
    .swagger-ui section.models { border-color: #2d2926; }
    .swagger-ui section.models h4 { color: #e8e4de; }

    .swagger-ui .highlight-code > .microlight {
      background: #0f0e0c !important;
    }

    /* Auth dialog */
    .swagger-ui .dialog-ux .modal-ux {
      background: #1a1714;
      border-color: #2d2926;
    }
    .swagger-ui .dialog-ux .modal-ux-header { border-bottom-color: #2d2926; }
    .swagger-ui .dialog-ux .modal-ux-header h3 { color: #f5f0ea; }

    /* Markdown inside descriptions */
    .swagger-ui .markdown p { color: #9b9590; }
    .swagger-ui .markdown code { background: #1a1714; color: #a5b4fc; border-radius: 3px; padding: 1px 4px; }
    .swagger-ui .markdown table th,
    .swagger-ui .markdown table td { border-color: #2d2926; color: #9b9590; }
    .swagger-ui .markdown table th { color: #e8e4de; }
  </style>
</head>
<body>
  <header class="api-header">
    <div class="api-header-logo">🛡️</div>
    <span class="api-header-title">CyberRisk Canvas - API Reference</span>
    <span class="api-header-badge">OpenAPI 3.1</span>
    <a class="api-header-back" href="/settings">← Settings</a>
  </header>

  <div id="swagger-ui"></div>

  <script src="${CDN}/swagger-ui-bundle.js"></script>
  <script src="${CDN}/swagger-ui-standalone-preset.js"></script>
  <script>
    window.addEventListener('DOMContentLoaded', function () {
      SwaggerUIBundle({
        url: ${JSON.stringify(specUrl)},
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset,
        ],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: 'StandaloneLayout',
        deepLinking: true,
        displayRequestDuration: true,
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 2,
        docExpansion: 'list',
        filter: true,
        tryItOutEnabled: true,
        persistAuthorization: true,
        syntaxHighlight: { activated: true, theme: 'agate' },
      });
    });
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      // Allow the page to load Swagger UI assets from jsdelivr
      'Content-Security-Policy': [
        "default-src 'self'",
        `script-src 'self' 'unsafe-inline' cdn.jsdelivr.net`,
        `style-src 'self' 'unsafe-inline' cdn.jsdelivr.net`,
        `img-src 'self' data:`,
        `connect-src 'self'`,
        `font-src 'self' cdn.jsdelivr.net`,
      ].join('; '),
    },
  });
}

/**
 * OpenAPI 3.1 specification for the CyberRisk Canvas REST API.
 * Covers all project-level endpoints that accept Bearer-token authentication.
 */

const SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'CyberRisk Canvas API',
    version: '2.0.0',
    description: [
      'REST API for **CyberRisk Canvas** - programmatic access to project versioning,',
      'SBOM upload, vulnerability triage, and VEX/CSAF export.',
      '',
      '## Authentication',
      'All endpoints require a **Pro license**. Create API keys in',
      '**Settings → API Keys** and pass them as a Bearer token:',
      '```',
      'Authorization: Bearer crc_<your-key>',
      '```',
      '',
      '## Project Versioning Model',
      'Every project has an explicit version series. Each version holds a',
      'TARA snapshot, an SBOM, and its associated vulnerability triage.',
      'The CSAF advisory is **global** - it aggregates vulnerabilities across',
      'all versions of a project.',
      '',
      '```',
      'Project',
      '├── Version 1  (frozen)  ← TARA + SBOM + triage (immutable)',
      '├── Version 2  (frozen)  ← TARA + SBOM + triage (immutable)',
      '└── Version 3  (active)  ← current work in progress',
      '```',
      '',
      'SBOM uploads always target the **active** version.',
      'Freezing a version creates an immutable snapshot and auto-creates the next active version.',
      '',
      '## Access control',
      'A key grants access to exactly the same projects as the user who created it.',
      'Project IDs can be found in **Settings → API Keys** or the project URL.',
    ].join('\n'),
    contact: {
      name: 'CyberRisk Canvas',
      url: 'https://cyberriskcanvas.com',
    },
    license: {
      name: 'Proprietary',
    },
  },

  servers: [
    {
      url: '',
      description: 'This instance',
    },
  ],

  security: [{ bearerAuth: [] }],

  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'CRC API Key (crc_…)',
        description: 'API key generated in **Settings → API Keys**. Keys are shown once on creation.',
      },
    },

    schemas: {
      // ── Versioning ────────────────────────────────────────────────────────
      ProjectVersion: {
        type: 'object',
        required: ['id', 'number', 'label', 'status', 'createdAt'],
        properties: {
          id:           { type: 'string', description: 'Version ID (cuid).' },
          number:       { type: 'integer', minimum: 1, description: 'Sequential version number starting at 1.' },
          label:        { type: 'string', description: 'User-defined label, e.g. "1.0" or "CRA-Audit-2025".' },
          status:       { type: 'string', enum: ['active', 'frozen'], description: '`active` = current work-in-progress; `frozen` = immutable snapshot.' },
          frozenAt:     { type: 'string', format: 'date-time', nullable: true },
          frozenByName: { type: 'string', nullable: true, description: 'Name of the person who approved the freeze.' },
          createdAt:    { type: 'string', format: 'date-time' },
          sbomCount:    { type: 'integer', description: 'Number of SBOM uploads for this version.' },
          vulnCount:    { type: 'integer', description: 'Total vulnerabilities found in this version.' },
        },
      },

      FreezeRequest: {
        type: 'object',
        required: ['label', 'frozenByName'],
        properties: {
          label:        { type: 'string', maxLength: 128, description: 'Version label, e.g. "1.0" or "CRA-Audit-Q1-2025".' },
          frozenByName: { type: 'string', maxLength: 256, description: 'Name of the approver.' },
        },
      },

      FreezeResponse: {
        type: 'object',
        required: ['frozenVersionId', 'newVersion'],
        properties: {
          frozenVersionId: { type: 'string', description: 'ID of the version that was just frozen.' },
          newVersion: {
            type: 'object',
            required: ['id', 'number', 'status', 'createdAt'],
            properties: {
              id:        { type: 'string' },
              number:    { type: 'integer' },
              status:    { type: 'string', enum: ['active'] },
              label:     { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },

      // ── SBOM ──────────────────────────────────────────────────────────────
      SbomUploadResponse: {
        type: 'object',
        required: ['sbomId', 'format', 'componentCount', 'vulnCount', 'criticalCount', 'highCount'],
        properties: {
          sbomId:         { type: 'string', description: 'ID of the stored SBOM record.' },
          format:         { type: 'string', enum: ['CycloneDX', 'SPDX'] },
          componentCount: { type: 'integer', description: 'Number of components parsed.' },
          vulnCount:      { type: 'integer', description: 'Total vulnerabilities found via OSV.dev.' },
          criticalCount:  { type: 'integer' },
          highCount:      { type: 'integer' },
        },
      },

      // ── Vulnerabilities ───────────────────────────────────────────────────
      VersionRef: {
        type: 'object',
        nullable: true,
        properties: {
          id:     { type: 'string' },
          number: { type: 'integer' },
        },
      },

      SbomMeta: {
        type: 'object',
        required: ['id', 'fileName', 'format', 'componentCount', 'uploadedAt'],
        properties: {
          id:             { type: 'string' },
          fileName:       { type: 'string' },
          format:         { type: 'string', enum: ['CycloneDX', 'SPDX'] },
          componentCount: { type: 'integer' },
          uploadedAt:     { type: 'string', format: 'date-time' },
        },
      },

      Vulnerability: {
        type: 'object',
        required: ['id', 'osvId', 'componentName', 'status', 'updatedAt'],
        properties: {
          id:               { type: 'string' },
          osvId:            { type: 'string', example: 'CVE-2023-44487' },
          cveId:            { type: 'string', nullable: true, example: 'CVE-2023-44487' },
          summary:          { type: 'string', nullable: true },
          severity:         { type: 'string', nullable: true, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE'] },
          cvssScore:        { type: 'number', nullable: true, minimum: 0, maximum: 10 },
          componentName:    { type: 'string' },
          componentVersion: { type: 'string', nullable: true },
          componentPurl:    { type: 'string', nullable: true },
          status: {
            type: 'string',
            enum: ['open', 'in_triage', 'not_affected', 'fixed'],
            description: 'VEX exploitability status.',
          },
          justification: {
            type: 'string',
            nullable: true,
            description: 'Free-text rationale for the status decision.',
          },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      VulnerabilityListResponse: {
        type: 'object',
        required: ['vulnerabilities'],
        properties: {
          version:         { '$ref': '#/components/schemas/VersionRef' },
          sbom:            { '$ref': '#/components/schemas/SbomMeta', nullable: true },
          vulnerabilities: {
            type: 'array',
            items: { '$ref': '#/components/schemas/Vulnerability' },
          },
        },
      },

      MitigationPatch: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['open', 'in_triage', 'not_affected', 'fixed'],
          },
          justification: {
            type: 'string',
            maxLength: 2000,
          },
        },
      },

      MitigationResponse: {
        type: 'object',
        required: ['id', 'status', 'updatedAt'],
        properties: {
          id:            { type: 'string' },
          status:        { type: 'string', enum: ['open', 'in_triage', 'not_affected', 'fixed'] },
          justification: { type: 'string', nullable: true },
          updatedAt:     { type: 'string', format: 'date-time' },
        },
      },

      // ── CSAF / VEX ────────────────────────────────────────────────────────
      CsafExportResponse: {
        type: 'object',
        required: ['vex', 'csaf', 'projectName'],
        properties: {
          projectName: { type: 'string' },
          vex: {
            type: 'object',
            description: 'CycloneDX VEX 1.4 document. Aggregates all versions.',
          },
          csaf: {
            type: 'object',
            description: 'CSAF 2.0 VEX advisory (`csaf_vex`). Aggregates all versions.',
          },
        },
      },

      // ── Errors ────────────────────────────────────────────────────────────
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string' },
        },
      },
    },

    responses: {
      Unauthorized: {
        description: 'Missing or invalid authentication.',
        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } },
      },
      Forbidden: {
        description: 'Valid key but Pro license required, or insufficient project access.',
        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } },
      },
      NotFound: {
        description: 'Resource not found.',
        content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } },
      },
    },

    parameters: {
      projectId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Project ID (cuid).',
      },
      versionId: {
        name: 'vid',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Version ID (cuid). Use `GET /versions` to list available version IDs.',
      },
      vulnId: {
        name: 'vulnId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Vulnerability ID (cuid).',
      },
      versionNumber: {
        name: 'version',
        in: 'query',
        required: false,
        schema: { type: 'integer', minimum: 1 },
        description: 'Version number to query. Omit to use the active (current) version.',
      },
    },
  },

  tags: [
    { name: 'Versions',         description: 'List and freeze project versions.' },
    { name: 'SBOM',             description: 'Upload Software Bills of Materials to the active version.' },
    { name: 'Vulnerabilities',  description: 'Query and triage discovered vulnerabilities.' },
    { name: 'Export',           description: 'Generate VEX and CSAF 2.0 advisory documents.' },
  ],

  paths: {
    // ── GET /api/projects/{id}/versions ────────────────────────────────────
    '/api/projects/{id}/versions': {
      get: {
        tags: ['Versions'],
        summary: 'List versions',
        operationId: 'listVersions',
        description: [
          'Returns all versions of a project ordered by version number ascending.',
          '',
          'One version always has `status: "active"` - this is the current work-in-progress.',
          'All other versions have `status: "frozen"` and are immutable.',
        ].join('\n'),
        parameters: [{ '$ref': '#/components/parameters/projectId' }],
        responses: {
          '200': {
            description: 'List of versions.',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { '$ref': '#/components/schemas/ProjectVersion' },
                },
                example: [
                  { id: 'clv1abc', number: 1, label: '1.0', status: 'frozen', frozenAt: '2025-03-01T10:00:00Z', frozenByName: 'Jane Doe', createdAt: '2025-01-01T00:00:00Z', sbomCount: 1, vulnCount: 12 },
                  { id: 'clv2def', number: 2, label: '',    status: 'active', frozenAt: null, frozenByName: null, createdAt: '2025-03-01T10:00:01Z', sbomCount: 0, vulnCount: 0 },
                ],
              },
            },
          },
          '401': { '$ref': '#/components/responses/Unauthorized' },
          '404': { '$ref': '#/components/responses/NotFound' },
        },
      },
    },

    // ── POST /api/projects/{id}/versions/{vid}/freeze ───────────────────────
    '/api/projects/{id}/versions/{vid}/freeze': {
      post: {
        tags: ['Versions'],
        summary: 'Freeze a version',
        operationId: 'freezeVersion',
        description: [
          'Freezes the specified **active** version and automatically creates the next active version.',
          '',
          'On freeze:',
          '- The current diagram state is captured as a `DiagramVersion` snapshot.',
          '- The version\'s `status` changes to `"frozen"` and `frozenAt` / `frozenByName` are recorded.',
          '- A new active version with `number + 1` is created.',
          '',
          'Only the currently **active** version can be frozen.',
          'Use `GET /versions` to find the active version ID.',
        ].join('\n'),
        parameters: [
          { '$ref': '#/components/parameters/projectId' },
          { '$ref': '#/components/parameters/versionId' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/FreezeRequest' },
              example: { label: '1.0', frozenByName: 'Jane Doe' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Version frozen. Returns the new active version.',
            content: {
              'application/json': {
                schema: { '$ref': '#/components/schemas/FreezeResponse' },
                example: {
                  frozenVersionId: 'clv1abc',
                  newVersion: { id: 'clv2def', number: 2, status: 'active', label: '', createdAt: '2025-03-01T10:00:01Z' },
                },
              },
            },
          },
          '400': { description: '`label` or `frozenByName` missing.', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
          '401': { '$ref': '#/components/responses/Unauthorized' },
          '403': { '$ref': '#/components/responses/Forbidden' },
          '404': { description: 'Project not found or specified version is not active.', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
        },
      },
    },

    // ── POST /api/projects/{id}/sbom ────────────────────────────────────────
    '/api/projects/{id}/sbom': {
      post: {
        tags: ['SBOM'],
        summary: 'Upload SBOM',
        operationId: 'uploadSbom',
        description: [
          'Parses a **CycloneDX** (1.2–1.6) or **SPDX** (2.x) BOM file (JSON),',
          'queries OSV.dev for known vulnerabilities, and stores the results',
          'in the **active version** of the project.',
          '',
          '- Replaces any previously uploaded SBOM for the active version.',
          '- Maximum 1 000 components per file; max file size 10 MB.',
          '- OSV.dev lookup is performed server-side in batches of 50.',
          '- Returns `409` if the project has no active version (should not occur in normal use).',
        ].join('\n'),
        parameters: [{ '$ref': '#/components/parameters/projectId' }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'CycloneDX or SPDX JSON file.',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'SBOM parsed and vulnerabilities stored in the active version.',
            content: {
              'application/json': {
                schema: { '$ref': '#/components/schemas/SbomUploadResponse' },
                example: { sbomId: 'clxyz123', format: 'CycloneDX', componentCount: 42, vulnCount: 7, criticalCount: 1, highCount: 3 },
              },
            },
          },
          '400': { description: 'Invalid file, unsupported format, or no components found.', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
          '401': { '$ref': '#/components/responses/Unauthorized' },
          '403': { '$ref': '#/components/responses/Forbidden' },
          '404': { '$ref': '#/components/responses/NotFound' },
          '409': { description: 'No active version exists for this project.', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
        },
      },
    },

    // ── GET /api/projects/{id}/vulnerabilities ──────────────────────────────
    '/api/projects/{id}/vulnerabilities': {
      get: {
        tags: ['Vulnerabilities'],
        summary: 'List vulnerabilities',
        operationId: 'listVulnerabilities',
        description: [
          'Returns the SBOM metadata and vulnerability list for a project version,',
          'sorted by severity (CRITICAL first).',
          '',
          'By default, the **active** (current) version is returned.',
          'Pass `?version=N` to read a specific frozen version.',
        ].join('\n'),
        parameters: [
          { '$ref': '#/components/parameters/projectId' },
          { '$ref': '#/components/parameters/versionNumber' },
        ],
        responses: {
          '200': {
            description: 'Vulnerability list. `sbom` is `null` if no SBOM has been uploaded for this version yet.',
            content: {
              'application/json': {
                schema: { '$ref': '#/components/schemas/VulnerabilityListResponse' },
              },
            },
          },
          '401': { '$ref': '#/components/responses/Unauthorized' },
          '403': { '$ref': '#/components/responses/Forbidden' },
          '404': { '$ref': '#/components/responses/NotFound' },
        },
      },
    },

    // ── PATCH /api/projects/{id}/vulnerabilities/{vulnId} ───────────────────
    '/api/projects/{id}/vulnerabilities/{vulnId}': {
      patch: {
        tags: ['Vulnerabilities'],
        summary: 'Set mitigation status',
        operationId: 'patchVulnerability',
        description: [
          'Updates the **VEX status** and optional **justification** of a single vulnerability.',
          'Only vulnerabilities in the **active** version can be edited.',
          '',
          '| Status | VEX meaning |',
          '|---|---|',
          '| `open` | Not yet triaged |',
          '| `in_triage` | Under investigation |',
          '| `not_affected` | Confirmed not exploitable |',
          '| `fixed` | Remediated in the product |',
        ].join('\n'),
        parameters: [
          { '$ref': '#/components/parameters/projectId' },
          { '$ref': '#/components/parameters/vulnId' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/MitigationPatch' },
              example: {
                status: 'not_affected',
                justification: 'The vulnerable code path is not reachable in our build configuration.',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated vulnerability record.',
            content: {
              'application/json': {
                schema: { '$ref': '#/components/schemas/MitigationResponse' },
              },
            },
          },
          '400': { description: 'Invalid status value.', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
          '401': { '$ref': '#/components/responses/Unauthorized' },
          '403': { '$ref': '#/components/responses/Forbidden' },
          '404': { '$ref': '#/components/responses/NotFound' },
        },
      },
    },

    // ── GET /api/projects/{id}/csaf/history ────────────────────────────────
    '/api/projects/{id}/csaf/history': {
      get: {
        tags: ['Export'],
        summary: 'List advisory history',
        operationId: 'listCsafHistory',
        description: 'Returns metadata for all previously generated CSAF advisories, newest first. Maximum 50 entries.',
        parameters: [{ '$ref': '#/components/parameters/projectId' }],
        responses: {
          '200': {
            description: 'List of advisory metadata.',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['id', 'createdAt'],
                    properties: {
                      id:        { type: 'string' },
                      createdAt: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
          '401': { '$ref': '#/components/responses/Unauthorized' },
          '403': { '$ref': '#/components/responses/Forbidden' },
          '404': { '$ref': '#/components/responses/NotFound' },
        },
      },
    },

    // ── GET /api/projects/{id}/csaf/history/{advisoryId} ───────────────────
    '/api/projects/{id}/csaf/history/{advisoryId}': {
      get: {
        tags: ['Export'],
        summary: 'Download a historic advisory',
        operationId: 'getCsafAdvisory',
        description: 'Returns the full CSAF 2.0 JSON content of a previously generated advisory.',
        parameters: [
          { '$ref': '#/components/parameters/projectId' },
          {
            name: 'advisoryId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Advisory ID from the history list.',
          },
        ],
        responses: {
          '200': {
            description: 'Advisory content.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['id', 'createdAt', 'content'],
                  properties: {
                    id:        { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                    content:   { type: 'object', description: 'CSAF 2.0 document.' },
                  },
                },
              },
            },
          },
          '401': { '$ref': '#/components/responses/Unauthorized' },
          '403': { '$ref': '#/components/responses/Forbidden' },
          '404': { '$ref': '#/components/responses/NotFound' },
        },
      },
    },

    // ── GET /api/projects/{id}/csaf ─────────────────────────────────────────
    '/api/projects/{id}/csaf': {
      get: {
        tags: ['Export'],
        summary: 'Generate VEX & CSAF advisory',
        operationId: 'exportCsaf',
        description: [
          'Generates two standards-compliant export documents from the vulnerability',
          'triage state and returns them in a single JSON payload.',
          '',
          'The export **aggregates vulnerabilities across all versions** of the project,',
          'so the advisory covers the full product lifecycle.',
          '',
          '**`vex`** - CycloneDX VEX 1.4 document mapping each vulnerability to its',
          'exploitability state and justification.',
          '',
          '**`csaf`** - CSAF 2.0 advisory (`csaf_vex` category) with a full product tree',
          'and vulnerability entries using CSAF `product_status` vocabulary.',
          '',
          'Document metadata (title, tracking ID, publisher, TLP, summary) is taken from',
          'the project\'s CSAF draft, which can be edited via the **CSAF Advisory** tab',
          'in the UI. The generated advisory is also persisted to the database.',
        ].join('\n'),
        parameters: [{ '$ref': '#/components/parameters/projectId' }],
        responses: {
          '200': {
            description: 'Generated VEX and CSAF documents.',
            content: {
              'application/json': {
                schema: { '$ref': '#/components/schemas/CsafExportResponse' },
              },
            },
          },
          '401': { '$ref': '#/components/responses/Unauthorized' },
          '403': { '$ref': '#/components/responses/Forbidden' },
          '404': {
            description: 'Project not found or no vulnerabilities exist to export.',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } },
          },
        },
      },
    },
  },
} as const;

export type OpenApiSpec = typeof SPEC;
export default SPEC;

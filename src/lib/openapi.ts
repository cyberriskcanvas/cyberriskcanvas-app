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
      ciToken: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'CRC CI token (crci_…)',
        description: 'Token scoped to ONE project, created in **Operations → CI/CD**. Only valid for `/api/ci/*`; safe to store as a pipeline secret.',
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
          unanalysable:   { type: 'integer', description: 'Components without a purl with a version; they cannot be checked for known vulnerabilities.' },
          triageKept:     { type: 'integer', description: 'Findings that already carry a triage decision.' },
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
          epss:             { type: 'number', nullable: true, minimum: 0, maximum: 1, description: 'EPSS: probability of exploitation within 30 days.' },
          fixed:            { type: 'array', items: { type: 'string' }, description: 'Versions that fix it, as listed in the advisory.' },
          exploited:        { type: 'boolean', description: 'Listed in the CISA KEV catalogue.' },
          suppressed:       { type: 'boolean', description: 'Accepted noise: not counted and never blocking.' },
          componentName:    { type: 'string' },
          componentVersion: { type: 'string', nullable: true },
          componentPurl:    { type: 'string', nullable: true },
          status: {
            type: 'string',
            enum: ['open', 'in_triage', 'affected', 'not_affected', 'fixed'],
            description: 'VEX exploitability status.',
          },
          justification: {
            type: 'string',
            nullable: true,
            description: 'Free-text rationale for the status decision.',
          },
          remediationCategory: { type: 'string', nullable: true, enum: ['vendor_fix', 'workaround', 'mitigation', 'none_available', 'no_fix_planned'] },
          remediationDetails: { type: 'string', nullable: true },
          remediationUrl: { type: 'string', nullable: true },
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
            enum: ['open', 'in_triage', 'affected', 'not_affected', 'fixed'],
          },
          justification: {
            type: 'string',
            maxLength: 2000,
          },
          suppressed: { type: 'boolean', description: 'Accepted noise: hidden from counts, never blocks the release gate.' },
          comment: { type: 'string', maxLength: 2000, description: 'Why; stored in the history of the finding.' },
          remediation: {
            type: 'object',
            nullable: true,
            description: 'What users can do about it. Replaces the stored remediation; `null` clears it.',
            properties: {
              category: { type: 'string', enum: ['vendor_fix', 'workaround', 'mitigation', 'none_available', 'no_fix_planned'] },
              details: { type: 'string', maxLength: 2000 },
              url: { type: 'string', format: 'uri', maxLength: 512 },
            },
          },
        },
      },

      MitigationResponse: {
        type: 'object',
        required: ['id', 'status', 'updatedAt'],
        properties: {
          id:            { type: 'string' },
          status:        { type: 'string', enum: ['open', 'in_triage', 'affected', 'not_affected', 'fixed'] },
          justification: { type: 'string', nullable: true },
          remediationCategory: { type: 'string', nullable: true },
          remediationDetails: { type: 'string', nullable: true },
          remediationUrl: { type: 'string', nullable: true },
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
            description: 'CSAF VEX advisory (`csaf_vex`) in version 2.0 or 2.1 (see `csafVersion`). Aggregates all versions.',
          },
          csafVersion: { type: 'string', enum: ['2.0', '2.1'] },
          warnings: { type: 'array', items: { type: 'string' } },
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
    { name: 'Export',           description: 'Generate VEX and CSAF advisory documents (CSAF 2.0, or 2.1 as preview).' },
    { name: 'CI/CD',            description: 'Upload SBOM and scan results from a pipeline and gate releases. Uses project-scoped CI tokens (`crci_…`).' },
  ],

  paths: {
    // ── POST /api/ci/ingest ────────────────────────────────────────────────
    '/api/ci/ingest': {
      post: {
        tags: ['CI/CD'],
        summary: 'Upload an SBOM or scan result from a pipeline',
        operationId: 'ciIngest',
        security: [{ ciToken: [] }],
        description: [
          'Evaluates the file and stores it as a run of the active version.',
          '',
          '- `sbom`: CycloneDX ≥ 1.6 or SPDX 3.0.1 (BSI TR-03183-2). The components are also scanned against OSV; existing VEX triage is kept.',
          '- `sast`, `vulnscan`: SARIF 2.1.0; only `error` findings make the run fail.',
          '- `secrets`: SARIF 2.1.0; any finding makes the run fail.',
          '- `dast`: SARIF 2.1.0 from a scan of the running product; only `error` findings fail the run.',
          '- `tls`: testssl.sh JSON (`--jsonfile`); any HIGH/CRITICAL/FATAL finding fails the run.',
          '- `ports`: nmap XML (`-oX`); fails when open ports are not declared as ports of connections in the architecture model (passes with a note when the model declares none).',
          '',
          'Multi-part products upload once per `part`; a source counts as ok only when all of its parts are.',
        ].join('\n'),
        parameters: [
          { name: 'source',  in: 'query', required: true,  schema: { type: 'string', enum: ['sbom', 'sast', 'secrets', 'vulnscan', 'dast', 'tls', 'ports'] } },
          { name: 'part',    in: 'query', required: false, schema: { type: 'string', pattern: '^[A-Za-z0-9._-]{0,64}$' }, description: 'e.g. `frontend`, `backend`, `image`.' },
          { name: 'commit',  in: 'query', required: false, schema: { type: 'string' } },
          { name: 'ref',     in: 'query', required: false, schema: { type: 'string' } },
          { name: 'url',     in: 'query', required: false, schema: { type: 'string' }, description: 'Link to the pipeline run.' },
          { name: 'version', in: 'query', required: false, schema: { type: 'integer' }, description: 'Defaults to the active version. Frozen versions return 409.' },
        ],
        requestBody: {
          required: true,
          content: { 'multipart/form-data': { schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } } } },
        },
        responses: {
          '200': {
            description: 'Run stored.',
            content: { 'application/json': { example: { runId: 'clr1abc', version: 2, source: 'sast', part: '', result: 'findings', summary: '3 findings (1 errors, 2 warnings, 0 notes)' } } },
          },
          '400': { description: 'Invalid file or parameters.' },
          '401': { '$ref': '#/components/responses/Unauthorized' },
          '403': { '$ref': '#/components/responses/Forbidden' },
          '409': { description: 'The requested version is frozen.' },
        },
      },
    },

    // ── GET /api/ci/gate ───────────────────────────────────────────────────
    '/api/ci/gate': {
      get: {
        tags: ['CI/CD'],
        summary: 'Release gate',
        operationId: 'ciGate',
        security: [{ ciToken: [] }],
        description: [
          'Returns 200 when the version may be released and **422** with the reasons when not, so `curl --fail-with-body` fails the job.',
          '',
          'Fails when a vulnerability with status `open` or `in_triage` (or `affected` without a fix, workaround or mitigation) is at or above `failOn`, when the newest SAST, vulnerability-scan or DAST run of any part has findings at or above `failOn` (severity from SARIF `security-severity`, else the level), when the newest secrets run has any finding, when the newest run of another source has findings, or when a source listed in `require` has no run.',
        ].join('\n'),
        parameters: [
          { name: 'require', in: 'query', required: false, schema: { type: 'string' }, description: 'Comma-separated sources that must have a run, e.g. `sbom,secrets`. `model` additionally fails the gate on open high-severity architecture check findings.' },
          { name: 'failOn',  in: 'query', required: false, schema: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] }, description: 'Severity from which untriaged vulnerabilities and SAST, vulnerability-scan and DAST findings block. Default: the project setting (high unless changed). Secrets always block.' },
          { name: 'version', in: 'query', required: false, schema: { type: 'integer' } },
          { name: 'format', in: 'query', required: false, schema: { type: 'string', enum: ['json', 'junit'], default: 'json' }, description: '`junit` answers with JUnit XML (same status codes): one failed test case per reason, for test-report widgets such as GitLab `artifacts:reports:junit`.' },
        ],
        responses: {
          '200': { description: 'Gate passes.', content: { 'application/json': { example: { pass: true, reasons: [], projectId: 'clp1', version: 2 } } } },
          '422': { description: 'Gate fails.', content: { 'application/json': { example: { pass: false, reasons: [{ code: 'open_vulnerabilities', message: '2 untriaged high+ vulnerabilities (e.g. CVE-2024-1 in openssl)' }], projectId: 'clp1', version: 2 } } } },
          '401': { '$ref': '#/components/responses/Unauthorized' },
          '403': { '$ref': '#/components/responses/Forbidden' },
        },
      },
    },

    // ── /api/projects/{id}/ci-tokens ───────────────────────────────────────
    '/api/projects/{id}/ci-tokens': {
      get: {
        tags: ['CI/CD'],
        summary: 'List CI tokens of a project',
        operationId: 'listCiTokens',
        description: 'Needs write access to the project (browser session).',
        parameters: [{ '$ref': '#/components/parameters/projectId' }],
        responses: { '200': { description: 'Tokens without secrets.' }, '401': { '$ref': '#/components/responses/Unauthorized' }, '404': { '$ref': '#/components/responses/NotFound' } },
      },
      post: {
        tags: ['CI/CD'],
        summary: 'Create a CI token',
        operationId: 'createCiToken',
        description: 'The raw token (`crci_…`) is returned once and cannot be recovered. Maximum 10 per project.',
        parameters: [{ '$ref': '#/components/parameters/projectId' }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } } } },
        responses: { '200': { description: 'Token created.' }, '400': { description: 'Missing name or limit reached.' }, '401': { '$ref': '#/components/responses/Unauthorized' }, '403': { '$ref': '#/components/responses/Forbidden' } },
      },
    },

    // ── GET /api/projects/{id}/ci/runs ─────────────────────────────────────
    '/api/projects/{id}/ci/runs': {
      get: {
        tags: ['CI/CD'],
        summary: 'CI run history and gate status',
        operationId: 'listCiRuns',
        parameters: [
          { '$ref': '#/components/parameters/projectId' },
          { name: 'version', in: 'query', required: false, schema: { type: 'integer' } },
        ],
        responses: { '200': { description: 'Last 50 runs, newest run per source/part, and the gate verdict at the project threshold (`failOn` in the answer).' }, '401': { '$ref': '#/components/responses/Unauthorized' }, '404': { '$ref': '#/components/responses/NotFound' } },
      },
    },

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
          'matches the components against OSV.dev (needs a purl with a version), and stores',
          'the components in the **active version** of the project.',
          '',
          '- Replaces any previously uploaded SBOM for the active version.',
          '- Maximum 20 000 components per file (`SBOM_MAX_COMPONENTS`), answered with `400` when exceeded; max file size 10 MB.',
          '- Triage decisions (status, justification, remediation) belong to the product and stay when an SBOM is replaced or a new version starts.',
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
          'Updates the **VEX status**, **justification**, **remediation** and **suppressed** flag of a single vulnerability. Only the fields sent change.',
          'The decision belongs to the **product**: it applies to the same component and advisory in every version and survives SBOM uploads.',
          'Every change is recorded with the user and the optional `comment` (`GET .../history`).',
          '',
          '| Status | VEX meaning |',
          '|---|---|',
          '| `open` | Not yet triaged |',
          '| `in_triage` | Under investigation |',
          '| `affected` | Confirmed exploitable; add a `remediation` (fix, workaround, mitigation) |',
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

    // ── GET /api/projects/{id}/vulnerabilities/{vulnId}/history ─────────────
    '/api/projects/{id}/vulnerabilities/{vulnId}/history': {
      get: {
        tags: ['Vulnerabilities'],
        summary: 'History of a triage decision',
        operationId: 'vulnerabilityHistory',
        description: 'Who changed what and why, newest first (up to 100 entries). `change` maps a field to `[old, new]`.',
        parameters: [{ '$ref': '#/components/parameters/projectId' }, { '$ref': '#/components/parameters/vulnId' }],
        responses: {
          '200': { description: 'Events.', content: { 'application/json': { example: [{ at: '2026-10-23T10:00:00.000Z', actorName: 'Ada', change: { status: ['open', 'not_affected'] }, comment: 'Code path not reachable' }] } } },
          '401': { '$ref': '#/components/responses/Unauthorized' },
          '403': { '$ref': '#/components/responses/Forbidden' },
          '404': { '$ref': '#/components/responses/NotFound' },
        },
      },
    },

    // ── GET /api/components ──────────────────────────────────────────────────
    '/api/components': {
      get: {
        tags: ['SBOM'],
        summary: 'Search components across products',
        operationId: 'searchComponents',
        description: 'Which products and versions contain a component, a license or a component affected by an advisory? Limited to the products the caller can see; at most 500 rows.',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Part of a purl, name or license (for example `GPL`), or a CVE/GHSA id. Aliases: `purl`, `name`, `license`, `cve`.' },
          { name: 'project', in: 'query', schema: { type: 'string' }, description: 'Restrict to one product (its active version unless `version` is given).' },
          { name: 'version', in: 'query', schema: { type: 'integer' }, description: 'Version number, with `project`.' },
        ],
        responses: {
          '200': { description: 'Matching components, one row per product version.', content: { 'application/json': { example: [{ projectId: 'clp1', projectName: 'Gateway', versionNumber: 2, versionStatus: 'active', name: 'log4j-core', version: '2.14.1', purl: 'pkg:maven/org.apache.logging.log4j/log4j-core@2.14.1', licenses: ['Apache-2.0'], direct: true, advisories: 3 }] } } },
          '400': { description: 'Neither `q` nor `project` given.', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
          '401': { '$ref': '#/components/responses/Unauthorized' },
          '403': { '$ref': '#/components/responses/Forbidden' },
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
        description: 'Returns the full CSAF JSON content of a previously generated advisory (in the version it was generated in).',
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
                    content:   { type: 'object', description: 'CSAF document (2.0 or 2.1).' },
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
          '**`csaf`** - CSAF advisory (`csaf_vex` category) with a full product tree',
          'and vulnerability entries using CSAF `product_status` vocabulary.',
          '',
          'Document metadata (title, tracking ID, publisher, TLP, summary) is taken from',
          'the project\'s CSAF draft, which can be edited via the **CSAF Advisory** tab',
          'in the UI. The generated advisory is also persisted to the database.',
          '',
          'CSAF 2.0 (OASIS Standard) is the default. CSAF 2.1 is still a Committee Specification',
          'Draft and is offered as a preview via `version=2.1` or the draft setting. The response',
          'contains `csafVersion` and `warnings` (e.g. a "not affected" without justification).',
        ].join('\n'),
        parameters: [
          { '$ref': '#/components/parameters/projectId' },
          { name: 'version', in: 'query', required: false, schema: { type: 'string', enum: ['2.0', '2.1'] }, description: 'Overrides the CSAF version of the draft.' },
        ],
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

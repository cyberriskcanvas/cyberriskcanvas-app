// Copy-paste pipeline snippets shown in the CI/CD panel.

export type CiPlatform = 'github' | 'gitlab' | 'curl';

export const CI_PLATFORMS: { id: CiPlatform; label: string }[] = [
  { id: 'github', label: 'GitHub Actions' },
  { id: 'gitlab', label: 'GitLab CI' },
  { id: 'curl', label: 'Shell / curl' },
];

const partLine = (part: string, indent: string) => (part ? `\n${indent}part: ${part}` : '');

export function ciSnippet(platform: CiPlatform, baseUrl: string, part = ''): string {
  if (platform === 'github') {
    return `# .github/workflows/canvas-evidence.yml
# Repository secret CRC_TOKEN = the CI token from this page.
name: Canvas evidence
on:
  push:
    branches: [main]
jobs:
  evidence:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anchore/sbom-action@v0            # SBOM (CycloneDX)
        with:
          format: cyclonedx-json
          output-file: sbom.cdx.json
      - uses: aquasecurity/trivy-action@0.28.0  # secrets
        with:
          scan-type: fs
          scanners: secret
          format: sarif
          output: secrets.sarif
      - uses: aquasecurity/trivy-action@0.28.0  # known vulnerabilities
        with:
          scan-type: fs
          scanners: vuln
          format: sarif
          output: vuln.sarif
      # Pin to a release tag instead of main for reproducible builds.
      - uses: cyberriskcanvas/cyberriskcanvas-app/ci@main
        with:
          url: ${baseUrl}
          token: \${{ secrets.CRC_TOKEN }}
          sbom: sbom.cdx.json
          secrets: secrets.sarif
          vulnscan: vuln.sarif${partLine(part, '          ')}
`;
  }
  if (platform === 'gitlab') {
    return `# .gitlab-ci.yml
# CI/CD variables: CRC_URL=${baseUrl}  and  CRC_TOKEN (masked) = the CI token from this page.
# The gate result appears in the merge request as a test report; with a GITLAB_TOKEN variable (api scope)
# also as a merge request comment in merge request pipelines.
include:
  - remote: https://raw.githubusercontent.com/cyberriskcanvas/cyberriskcanvas-app/main/ci/gitlab-ci.yml

canvas-evidence:
  extends: .crc
  needs: [scan]          # the job that produces the files below, as artifacts
  variables:${part ? `\n    CRC_PART: "${part}"` : ''}
    CRC_FILES: "sbom=sbom.cdx.json vulnscan=vuln.sarif secrets=secrets.sarif"
`;
  }
  return `# Any pipeline or your machine. Keep the token in your CI secret store, never in the repository.
export CRC_URL=${baseUrl}
export CRC_TOKEN=crci_...${part ? `\nexport CRC_PART=${part}` : ''}

curl -fsS "$CRC_URL/ci/crc.sh" -o crc.sh
# Files come from your own tools: an SBOM (CycloneDX >= 1.6 / SPDX 3.0.1) and SARIF 2.1.0 results.
sh crc.sh sbom=sbom.cdx.json secrets=secrets.sarif vulnscan=vuln.sarif sast=sast.sarif
# The script exits non-zero when the release gate fails, which fails your job.
`;
}

/**
 * Tests against the RUNNING product, run from your own pipeline against your own targets.
 * Canvas never scans anything itself; only test systems you are allowed to test.
 */
export function ciLiveTestSnippet(baseUrl: string): string {
  return `# Tests against the running product. Only test systems you own or are authorised to test.
# Run them in a job that can reach the staging/test deployment, then upload the results.
export CRC_URL=${baseUrl}
export CRC_TOKEN=crci_...
TARGET=https://staging.example.com        # your own test deployment
HOST=staging.example.com

# 1. DAST (any tool that writes SARIF 2.1.0, e.g. nuclei)
nuclei -u "$TARGET" -sarif-export dast.sarif

# 2. TLS configuration (testssl.sh, JSON report)
testssl.sh --jsonfile tls.json "$HOST:443"

# 3. Open ports (nmap XML). They are compared with the ports of the connections in your architecture model.
nmap -Pn -p- -oX ports.xml "$HOST"

curl -fsS "$CRC_URL/ci/crc.sh" -o crc.sh
sh crc.sh dast=dast.sarif tls=tls.json ports=ports.xml
`;
}

/** Release from a tag build, pull request comment and issues for open work. */
export function ciReleaseSnippet(baseUrl: string): string {
  return `# .github/workflows/canvas-release.yml
# Freezes the active version in Canvas with the tag name once the release gate passes.
# A retried job with the same tag changes nothing.
name: Canvas release
on:
  push:
    tags: ['v*']
permissions:
  contents: read
  issues: write
  pull-requests: write
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # ... produce sbom.cdx.json and the scan results as in the evidence workflow ...
      - uses: cyberriskcanvas/cyberriskcanvas-app/ci@main
        with:
          url: ${baseUrl}
          token: \${{ secrets.CRC_TOKEN }}
          sbom: sbom.cdx.json
          release: \${{ github.ref_name }}      # freeze as this release
          issues: 'true'                        # issues for open measures and failed tests
          github-token: \${{ github.token }}
          # comment: 'true'                     # on pull_request runs: gate result as a comment

# GitLab: set CRC_RELEASE: $CI_COMMIT_TAG in a tag pipeline job (see ci/gitlab-ci.yml).
# Other CI: CRC_RELEASE=v1.2.0 sh crc.sh sbom=sbom.cdx.json
`;
}

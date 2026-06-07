# Security Policy

## Supported Versions

We provide security updates for the latest release only.

| Version | Supported |
| --- | --- |
| latest | ✓ |
| older | ✗ |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub Issues.**

Report vulnerabilities privately via one of the following channels:

- **GitHub Security Advisories:** [Report a vulnerability](../../security/advisories/new)
- **Email:** security@cyberriskcanvas.com

Please include:

- A clear description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

## Response Timeline

| Step | Timeline |
| --- | --- |
| Acknowledgement | within 48 hours |
| Initial assessment | within 5 business days |
| Fix or mitigation | within 30 days (critical: 7 days) |
| Public disclosure | after fix is released |

## Scope

**In scope:**

- Authentication and authorization bypasses
- Remote code execution
- SQL injection / data exfiltration
- Cross-site scripting (XSS) in the application
- Insecure direct object references
- Server-side request forgery (SSRF)

**Out of scope:**

- Vulnerabilities in self-hosted infrastructure (the deployer's responsibility)
- Denial-of-service attacks
- Social engineering
- Issues in dependencies - report those directly to the upstream project

## Security Considerations for Self-Hosted Deployments

When running CyberRisk Canvas on your own infrastructure:

### Application & Secrets

- Always use HTTPS in production (`AUTH_URL` must be `https://`)
- Generate a strong `AUTH_SECRET` (`openssl rand -base64 32`)
- Use a strong `POSTGRES_PASSWORD` and never expose port 5432 publicly
- Keep the Docker image up to date (`docker pull` regularly or use automated update tooling)
- Restrict network access to the Redis port
- Store `LICENSE_KEY` and `ANTHROPIC_API_KEY` as secrets, not in plaintext files - use Docker secrets or a secrets manager (e.g. Vault, AWS Secrets Manager)

### Host Operating System

- Run a minimal, hardened OS (e.g. Ubuntu LTS minimal, Debian slim, or a container-optimised OS like Flatcar/Bottlerocket)
- Apply OS security patches promptly; enable unattended-upgrades or equivalent
- Disable or remove unused services and open ports on the host
- Use SSH key authentication only - disable password-based SSH login
- Run Docker as a non-root user where possible; avoid `--privileged` containers
- Enable and configure a host-based audit daemon (e.g. `auditd`) for critical file and syscall monitoring

### Firewall & Network Hardening

- Place CyberRisk Canvas behind a reverse proxy (e.g. nginx, Caddy, or a cloud load balancer) that terminates TLS
- Use a firewall (e.g. `ufw`, `nftables`, or a cloud security group) to allow only ports 80/443 inbound; block all other inbound traffic by default
- Ensure database (5432) and Redis ports are never reachable from the public internet - bind them to `127.0.0.1` or an internal Docker network only
- Consider restricting outbound traffic to known endpoints (e.g. Anthropic API, Mollie, your SMTP relay)
- If deploying in the cloud, use VPC/private subnets and security groups rather than relying solely on host-level firewalls

### Docker Runtime Hardening

- Use Docker's default `seccomp` and `AppArmor`/`SELinux` profiles; do not disable them
- Drop unnecessary Linux capabilities in your Compose file (`cap_drop: [ALL]`, add back only what is needed)
- Set containers to read-only filesystem where practical (`read_only: true`); mount writable volumes explicitly
- Enable Docker Content Trust (`DOCKER_CONTENT_TRUST=1`) to verify image signatures
- Scan images regularly for known CVEs (e.g. `docker scout cves`, Trivy, or Grype)
- Do not expose the Docker socket (`/var/run/docker.sock`) to application containers

### Monitoring & Incident Response

- Aggregate and monitor logs from both the host and containers (e.g. via Loki, CloudWatch, or a SIEM)
- Set up alerting for failed authentication attempts, unexpected privilege escalation, and abnormal outbound connections
- Have a documented incident-response plan - know how to isolate a compromised container and rotate all secrets
- Perform periodic backups of the Postgres database and verify restore procedures

## Credit

We appreciate responsible disclosure. Reporters of valid vulnerabilities will be credited in the release notes (unless they prefer to remain anonymous).

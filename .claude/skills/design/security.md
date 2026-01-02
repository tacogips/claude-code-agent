---
name: design-security
description: Security guidelines for design documents and output files.
---

# Security Guidelines for Design Documents

This document defines mandatory security rules for all design documents and generated output files.

## Core Rule

**Design documents and output files must NEVER contain sensitive information that could expose the host system or user credentials.**

## Prohibited Content in Design Documents

### 1. Host Machine Absolute Paths

- Never reference absolute filesystem paths from the host machine
- Use relative paths from project root or placeholder paths instead
- Use generic path patterns like `{project_root}/...`

Examples:
```markdown
<!-- PROHIBITED -->
Configuration stored at: /home/developer/projects/myapp/config

<!-- ALLOWED -->
Configuration stored at: ./config (relative to project root)
Configuration stored at: {project_root}/config
```

### 2. Credential Information

Design documents must never contain actual values of:

| Category | Description |
|----------|-------------|
| Environment Variables | Values of `GITHUB_TOKEN`, `AWS_SECRET_ACCESS_KEY`, API keys, tokens |
| SSH Keys | Private key content, key passphrases |
| Cryptocurrency Keys | Private keys, seed phrases, wallet secrets |
| Database Credentials | Actual passwords, connection strings with embedded credentials |
| Service Credentials | OAuth tokens, JWT secrets, actual service account keys |

### 3. Private Repository URLs

- GitHub private repository URLs are treated as credential information
- Only include private repository URLs when **explicitly instructed by the user**
- When referencing external code, use public repositories or describe the pattern without URLs

## Guidelines for Design Documentation

### Architecture Documents

```markdown
<!-- PROHIBITED -->
The service authenticates using token: ghp_abc123...
SSH into server at 192.168.1.100 using key /home/admin/.ssh/prod_key

<!-- ALLOWED -->
The service authenticates using environment variable: GITHUB_TOKEN
SSH authentication uses deployment keys stored in secure key management
```

### Configuration Design

```markdown
<!-- PROHIBITED -->
Database connection: postgres://admin:secretPassword123@db.example.com/app

<!-- ALLOWED -->
Database connection: postgres://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}
Credentials are managed via environment variables or secret manager
```

### Deployment Documentation

```markdown
<!-- PROHIBITED -->
Deploy from /home/ci-user/deployments/production

<!-- ALLOWED -->
Deploy from {deployment_root}/production
Deploy from ./deployments/production (relative to CI workspace)
```

## When Documenting External Integrations

When designing integrations with external services:

1. **Reference** credential names, not values
2. **Describe** where credentials should be stored (env vars, secret manager)
3. **Never** include actual tokens, keys, or passwords
4. **Use placeholders** like `{API_KEY}` or `${SERVICE_TOKEN}`

## Review Checklist for Design Documents

Before finalizing any design document, verify:

- [ ] No absolute host machine paths
- [ ] No actual credential values (environment variable references are OK)
- [ ] No SSH private key content
- [ ] No cryptocurrency keys or seed phrases
- [ ] No private repository URLs (unless explicitly authorized)
- [ ] No hardcoded API tokens or secrets
- [ ] Sensitive paths use placeholders or relative references

## Handling User Requests

If a user requests design documentation that would include sensitive information:

1. **Clarify** whether the sensitive information is truly needed
2. **Suggest** using placeholders or references instead
3. **Warn** about security implications if they insist
4. **Document** using secure patterns (env var references, secret manager references)

## Integration with Design Workflow

These security guidelines apply to all design-related outputs:

- `design-docs/architecture/*.md`
- `design-docs/features/*.md`
- `design-docs/qa/*.md`
- `design-docs/*.md`
- Any generated configuration templates
- Any generated deployment documentation

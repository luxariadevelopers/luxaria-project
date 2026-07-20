# AWS production deployment runbook — Luxaria Developers ERP

Executable plan for deploying the Luxaria monorepo to AWS. This document covers **infrastructure**, **secrets**, **CI/CD wiring**, **backups**, **rollback**, and **validation**. It does not contain secret values.

**Related docs**

| Topic | Document |
|-------|----------|
| Docker images & local prod stack | [DOCKER.md](./DOCKER.md) |
| GitHub Actions & deploy workflow | [CI.md](./CI.md) |
| MongoDB Atlas | [../apps/backend/docs/MONGODB_ATLAS.md](../apps/backend/docs/MONGODB_ATLAS.md) |
| S3 documents API | [../apps/backend/docs/DOCUMENTS_S3_API.md](../apps/backend/docs/DOCUMENTS_S3_API.md) |
| Backend security | [../apps/backend/docs/SECURITY_CHECKLIST.md](../apps/backend/docs/SECURITY_CHECKLIST.md) |

---

## 1. Architecture overview

Recommended production layout (ECS Fargate + managed services):

```text
Internet
   │
   ▼
Route 53 (optional) ──► ACM certificate
   │
   ▼
Application Load Balancer (HTTPS :443)
   │  default → web target group (:8080)
   │  optional path /api/* → backend target group (:9000)
   ▼
ECS cluster (Fargate)
   ├── Service: luxaria-web   (nginx + static SPA)
   └── Service: luxaria-api   (NestJS, private subnets)
           │
           ├── MongoDB Atlas (mongodb+srv, VPC peering or IP allowlist)
           ├── ElastiCache Redis (BullMQ + cache; REDIS_ENABLED=true)
           └── S3 private bucket (documents presign flow)
```

**Why ECS over raw EC2:** matches existing Dockerfiles, rolling deploys, health checks, and Secrets Manager injection without SSH drift.

**EC2 alternative (§4):** run `docker-compose.prod.yml` on one or two instances behind an ALB, but replace Compose `mongo`/`redis` with Atlas + ElastiCache (do not run MongoDB on EC2 for production).

**Mobile:** Expo app (`apps/mobile`) is **not** hosted on AWS. Ship via EAS / app stores with `EXPO_PUBLIC_API_BASE_URL` pointing at the public API origin (see §10).

---

## 2. Prerequisites

### Accounts & tooling

- AWS account with admin access (or scoped deploy role)
- MongoDB Atlas project (M10+ recommended for production)
- GitHub repo with Environments `staging` and `production` ([CI.md](./CI.md))
- Local: AWS CLI v2, `docker`, `pnpm`, `git`

### Repository artifacts (already in repo)

| Artifact | Purpose |
|----------|---------|
| `apps/backend/Dockerfile` | Production API image (non-root, port 9000) |
| `apps/web/Dockerfile` | Static web + nginx-unprivileged (port 8080) |
| `apps/web/nginx.conf` | SPA + `/api/` reverse proxy to backend |
| `docker-compose.prod.yml` | Reference stack (swap mongo/redis for managed services on AWS) |
| `.github/workflows/deploy.yml` | Manual deploy workflow (placeholder — wire in §9) |
| `.env.docker.example` | Env key reference for containers |

### Naming convention (replace `<env>`)

| Resource | Example |
|----------|---------|
| Region | `ap-south-1` (matches default `AWS_REGION`) |
| ECR repos | `luxaria/backend`, `luxaria/web` |
| ECS cluster | `luxaria-<env>` |
| S3 bucket | `luxaria-<env>-documents-<account-id>` |
| Secrets Manager | `luxaria/<env>/backend` |
| ALB | `luxaria-<env>-alb` |
| DNS | `app.staging.example.com`, `app.example.com` |

---

## 3. Phase A — Foundation (run once per environment)

Execute in order. Check off each sub-step before moving on.

### A1. VPC & networking

1. Use the **default VPC** for a pilot, or create a VPC with:
   - 2+ public subnets (ALB)
   - 2+ private subnets (ECS tasks, ElastiCache)
   - NAT gateway(s) for private subnet egress (Atlas, S3, ECR)
2. Create security groups:

| SG | Inbound | Outbound |
|----|---------|----------|
| `alb-sg` | 443 from `0.0.0.0/0` (restrict to corp IP if possible) | all |
| `web-sg` | 8080 from `alb-sg` | all |
| `api-sg` | 9000 from `web-sg` and/or `alb-sg` | all |
| `redis-sg` | 6379 from `api-sg` | none |

3. Record subnet IDs and SG IDs for later steps.

### A2. MongoDB Atlas

Follow [MONGODB_ATLAS.md](../apps/backend/docs/MONGODB_ATLAS.md).

**Production checklist:**

- [ ] M10+ cluster (or M0 for staging only)
- [ ] Database user: read/write on `luxaria-erp` only
- [ ] Network: Atlas **IP access list** for NAT egress IPs, or **VPC peering** / **Private Endpoint**
- [ ] Connection string stored only in Secrets Manager (never in git)
- [ ] Enable Atlas **Cloud Backup** (continuous backup on M10+)
- [ ] Set `MONGODB_URI` with `retryWrites=true&w=majority`

```bash
# Example shape only — use Atlas UI copy, store in Secrets Manager
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/luxaria-erp?retryWrites=true&w=majority
```

### A3. ElastiCache Redis

Production requires `REDIS_ENABLED=true` for BullMQ background jobs (stock reorder, DPR alerts, etc.).

1. Create **ElastiCache Redis 7** replication group (single node OK for staging; multi-AZ for production).
2. Subnet group: private subnets. Security group: `redis-sg`.
3. Enable in-transit encryption + auth token (`REDIS_PASSWORD`).
4. Record primary endpoint: `<name>.xxxx.ng.0001.aps1.cache.amazonaws.com:6379`.

```bash
REDIS_ENABLED=true
REDIS_HOST=<elasticache-primary-endpoint>
REDIS_PORT=6379
REDIS_PASSWORD=<auth-token>
```

### A4. S3 documents bucket

Follow [DOCUMENTS_S3_API.md](../apps/backend/docs/DOCUMENTS_S3_API.md).

1. Create bucket `luxaria-<env>-documents-<account-id>` in `ap-south-1`.
2. **Block all public access** (account + bucket).
3. Bucket policy: deny `s3:PutObjectAcl`, deny non-TLS (`aws:SecureTransport`).
4. Enable **versioning** and **default encryption** (SSE-S3 or SSE-KMS).
5. Lifecycle (optional): transition old versions to IA after 90 days; expire noncurrent versions after 365 days.
6. IAM user or task role with least privilege:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::luxaria-<env>-documents-<account-id>",
        "arn:aws:s3:::luxaria-<env>-documents-<account-id>/*"
      ]
    }
  ]
}
```

Prefer **ECS task IAM role** over long-lived `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` when running on AWS (omit static keys from secrets if the task role is attached).

Env keys (see §10): `AWS_REGION`, `AWS_BUCKET_NAME`, `AWS_S3_PREFIX`, optional size/TTL overrides.

### A5. Secrets Manager (no secrets in repo)

Create secret `luxaria/<env>/backend` (JSON):

```json
{
  "MONGODB_URI": "mongodb+srv://...",
  "JWT_ACCESS_SECRET": "<≥32 random chars>",
  "JWT_REFRESH_SECRET": "<≥32 random chars>",
  "FIELD_ENCRYPTION_KEY": "<≥32 random chars>",
  "REDIS_PASSWORD": "<elasticache-auth-token>",
  "AWS_ACCESS_KEY_ID": "<only if not using task role>",
  "AWS_SECRET_ACCESS_KEY": "<only if not using task role>"
}
```

Create `luxaria/<env>/backend-env` for non-secret config (plain JSON or SSM Parameter Store):

```json
{
  "NODE_ENV": "production",
  "PORT": "9000",
  "CORS_ORIGINS": "https://app.example.com",
  "SWAGGER_ENABLED": "false",
  "LOG_LEVEL": "info",
  "AUTH_COOKIE_SECURE": "true",
  "AUTH_COOKIE_SAME_SITE": "lax",
  "AUTH_COOKIE_DOMAIN": ".example.com",
  "REDIS_ENABLED": "true",
  "REDIS_HOST": "<elasticache-endpoint>",
  "REDIS_PORT": "6379",
  "AWS_REGION": "ap-south-1",
  "AWS_BUCKET_NAME": "luxaria-<env>-documents-<account-id>",
  "AWS_S3_PREFIX": "luxaria-developers/"
}
```

**Rules**

- Never commit `.env`, `.env.docker`, or real secrets.
- Rotate JWT and encryption keys on compromise; plan rotation (§8).
- GitHub Actions: store deploy tokens in Environment secrets only ([CI.md](./CI.md)).

### A6. ECR repositories

```bash
export AWS_REGION=ap-south-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

aws ecr create-repository --repository-name luxaria/backend --image-scanning-configuration scanOnPush=true
aws ecr create-repository --repository-name luxaria/web --image-scanning-configuration scanOnPush=true

aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
```

---

## 4. Phase B — Compute (ECS Fargate recommended)

### B1. Build and push images

From repo root (same Dockerfiles as [DOCKER.md](./DOCKER.md)):

```bash
export IMAGE_TAG="${GITHUB_SHA:-$(git rev-parse --short HEAD)}"
export ECR="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

docker build -f apps/backend/Dockerfile -t "luxaria/backend:${IMAGE_TAG}" .
docker tag "luxaria/backend:${IMAGE_TAG}" "${ECR}/luxaria/backend:${IMAGE_TAG}"
docker tag "luxaria/backend:${IMAGE_TAG}" "${ECR}/luxaria/backend:latest"
docker push "${ECR}/luxaria/backend:${IMAGE_TAG}"
docker push "${ECR}/luxaria/backend:latest"

docker build -f apps/web/Dockerfile \
  --build-arg VITE_API_BASE_URL=/api/v1 \
  -t "luxaria/web:${IMAGE_TAG}" .
docker tag "luxaria/web:${IMAGE_TAG}" "${ECR}/luxaria/web:${IMAGE_TAG}"
docker tag "luxaria/web:${IMAGE_TAG}" "${ECR}/luxaria/web:latest"
docker push "${ECR}/luxaria/web:${IMAGE_TAG}"
docker push "${ECR}/luxaria/web:latest"
```

Web image bakes `VITE_API_BASE_URL=/api/v1` so the browser calls same-origin `/api/v1` through nginx or ALB.

### B2. ECS task definitions

**Backend task** (`luxaria-api`):

| Setting | Value |
|---------|-------|
| Launch type | FARGATE |
| CPU / memory | 512 / 1024 (scale up for load) |
| Container port | 9000 |
| Health check | `CMD curl -fsS http://127.0.0.1:9000/api/v1/health` |
| Secrets | Inject from `luxaria/<env>/backend` |
| Environment | From `luxaria/<env>/backend-env` |
| Task role | S3 access (if not using static AWS keys) |
| Execution role | ECR pull + Secrets Manager read |
| Network | awsvpc, private subnets, `api-sg` |

**Web task** (`luxaria-web`):

| Setting | Value |
|---------|-------|
| Container port | 8080 |
| Health check | wget `/` on 8080 |
| Environment | none required (static build) |
| Network | private subnets, `web-sg` |

**nginx → backend routing:** default `apps/web/nginx.conf` proxies `/api/` to hostname `backend:9000`. On ECS, either:

1. **Service Connect / Cloud Map:** register backend as `backend` in the same namespace as web tasks, or
2. **ALB path rules:** route `/api/*` to backend TG and `/*` to web TG (bypass nginx proxy; set backend SG to allow ALB), or
3. **Sidecar:** single task with both containers sharing `localhost` network (simplest for small deployments).

Document the chosen option in your internal ops notes.

### B3. ECS services

```bash
# Illustrative — prefer AWS Console, Terraform, or CDK for repeatability
aws ecs create-cluster --cluster-name "luxaria-<env>"

# Create services with desiredCount=2 (production), 1 (staging)
# Attach to ALB target groups (see B4)
# Enable deployment circuit breaker + rollback
# Set healthCheckGracePeriodSeconds ≥ 60
```

Deployment settings:

- **Minimum healthy percent:** 100
- **Maximum percent:** 200
- **Circuit breaker:** enabled with rollback

### B4. Application Load Balancer + SSL

1. Request **ACM certificate** in `ap-south-1` for `app.example.com` (and staging hostname).
2. Validate via DNS (Route 53) or email.
3. Create ALB in public subnets, `alb-sg`.
4. Listener **443 HTTPS** → forward to web target group (port 8080).
5. Optional second target group for API (port 9000) with path rule `/api/*`.
6. Listener **80 HTTP** → redirect to 443.
7. Enable access logs to S3 (optional, for audit).

**TLS policy:** `ELBSecurityPolicy-TLS13-1-2-2021-06` or newer.

**Backend cookie auth:** with HTTPS termination at ALB, set `AUTH_COOKIE_SECURE=true`. If the app sees HTTP internally, configure nginx/ALB to pass `X-Forwarded-Proto: https` (already in `nginx.conf`).

### B5. DNS

Create Route 53 (or external DNS) **A/AAAA alias** to the ALB:

```text
app.example.com  →  alias  →  luxaria-prod-alb-xxxxx.ap-south-1.elb.amazonaws.com
```

Update `CORS_ORIGINS` and `AUTH_COOKIE_DOMAIN` to match the public origin.

---

## 5. Phase C — EC2 alternative (single-host pilot)

Use only when ECS is not yet available. **Do not** rely on Compose `mongo`/`redis` volumes in AWS production.

1. Launch Amazon Linux 2023 EC2 (t3.medium+), IAM instance profile with ECR pull + Secrets Manager read.
2. Install Docker + Compose plugin.
3. Fetch secrets at boot (systemd unit or `aws secretsmanager get-secret-value`).
4. Write `/opt/luxaria/.env.docker` from secrets (file mode `600`, owned by root).
5. Override Compose env for Atlas + ElastiCache:

```bash
# /opt/luxaria/.env.docker — keys only; values from Secrets Manager
MONGODB_URI=mongodb+srv://...
REDIS_ENABLED=true
REDIS_HOST=<elasticache-endpoint>
REDIS_PASSWORD=...
CORS_ORIGINS=https://app.example.com
AUTH_COOKIE_SECURE=true
SWAGGER_ENABLED=false
```

6. Run web + backend only (no mongo/redis services):

```bash
cd /opt/luxaria/repo
docker compose -f docker-compose.prod.yml up -d web backend
# Remove or profile-out mongo/redis from prod compose on EC2
```

7. Place ALB or nginx on the host for TLS (prefer ALB + ACM).

---

## 6. Phase D — CI/CD (GitHub Actions)

Current state: [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) is a **placeholder**. Wire it after infrastructure exists.

### D1. GitHub Environments

Create **staging** and **production** with:

| Name | Type | Use |
|------|------|-----|
| `AWS_ROLE_ARN` | secret | OIDC assume-role (preferred) |
| `AWS_REGION` | variable | `ap-south-1` |
| `ECS_CLUSTER` | variable | `luxaria-staging` / `luxaria-production` |
| `ECS_SERVICE_API` | variable | `luxaria-api` |
| `ECS_SERVICE_WEB` | variable | `luxaria-web` |
| `ECR_REGISTRY` | variable | `{account}.dkr.ecr.ap-south-1.amazonaws.com` |
| `APP_URL` | variable | Public URL for smoke tests |

Enable required reviewers on **production**.

### D2. OIDC trust (preferred over long-lived keys)

1. IAM OIDC provider for `token.actions.githubusercontent.com`.
2. Role `GitHubActionsLuxariaDeploy` with trust policy scoped to this repo + `environment:production`.
3. Attach policies: ECR push, ECS `UpdateService` + `RegisterTaskDefinition`, PassRole for task/execution roles.

### D3. Replace deploy placeholder

Example flow (adapt to your IaC):

```yaml
# Inside deploy.yml deploy job — illustrative
- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
    aws-region: ${{ vars.AWS_REGION }}

- name: Build and push images
  run: |
    # build + push backend/web with tag ${{ github.sha }}

- name: Deploy ECS services
  run: |
    aws ecs update-service --cluster "${{ vars.ECS_CLUSTER }}" \
      --service "${{ vars.ECS_SERVICE_API }}" --force-new-deployment
    aws ecs update-service --cluster "${{ vars.ECS_CLUSTER }}" \
      --service "${{ vars.ECS_SERVICE_WEB }}" --force-new-deployment

- name: Wait for steady state
  run: |
    aws ecs wait services-stable --cluster "${{ vars.ECS_CLUSTER }}" \
      --services "${{ vars.ECS_SERVICE_API }}" "${{ vars.ECS_SERVICE_WEB }}"
```

Run manually: **Actions → Deploy → Run workflow** → choose `staging` or `production` ([CI.md](./CI.md)).

PR validation ([pr-validation.yml](../.github/workflows/pr-validation.yml)) must stay green before deploy.

---

## 7. Backups & disaster recovery

| Component | Backup method | RPO / RTO guidance |
|-----------|---------------|-------------------|
| MongoDB Atlas | Atlas Cloud Backup (continuous on M10+) | RPO minutes; RTO per Atlas restore drill |
| S3 documents | Versioning + optional cross-region replication | Object-level restore from version ID |
| Redis | ElastiCache snapshots (daily) | Cache rebuild acceptable; BullMQ jobs may replay |
| ECS task defs | Stored in AWS; also tag images in ECR | Redeploy previous image tag |
| Secrets | Secrets Manager versioning | Restore previous secret version |

### Atlas restore drill (quarterly)

1. Restore backup to a **temporary** cluster in Atlas.
2. Point staging API at temp URI.
3. Run validation checklist (§9).
4. Delete temp cluster.

### S3 restore

```bash
aws s3api list-object-versions --bucket luxaria-prod-documents-<account-id> --prefix luxaria-developers/
aws s3api copy-object --bucket ... --copy-source "...?versionId=..." --key ...
```

---

## 8. Rollback

### Fast rollback (application)

1. Identify last good image tag in ECR (`git sha` or `latest` before bad deploy).
2. Update ECS task definition to previous image digest/tag.
3. `aws ecs update-service --force-new-deployment` for API and web.
4. Wait for `services-stable`.
5. Verify §9 checks on `APP_URL`.

### Database rollback

- **Schema/data:** restore Atlas snapshot to a new cluster; cut over `MONGODB_URI` (maintenance window). There is no automatic down-migration — plan forward-only migrations.
- **Documents:** revert S3 object version if a bad upload shipped.

### Secret rollback

```bash
aws secretsmanager update-secret-version-stage \
  --secret-id luxaria/production/backend \
  --version-stage AWSCURRENT \
  --move-to-version-id <previous-version-id>
```

Then redeploy ECS tasks to pick up secrets.

### Disable bad release at edge

- ALB: detach unhealthy target group or revert listener rule.
- Route 53: weighted routing to previous stack (if blue/green).

---

## 9. Environment dependencies

### Backend (`apps/backend`)

**Required in production** (validated at startup — see `env.validation.ts`):

| Variable | Notes |
|----------|-------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Atlas SRV string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | ≥32 chars, unique |
| `FIELD_ENCRYPTION_KEY` | ≥32 chars; rotation requires re-encryption plan |
| `CORS_ORIGINS` | Comma-separated HTTPS origins; never `*` |
| `AWS_BUCKET_NAME` | S3 bucket for documents |
| `REDIS_ENABLED` | `true` in AWS production |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | ElastiCache |

**Strongly recommended:**

| Variable | Production value |
|----------|------------------|
| `SWAGGER_ENABLED` | `false` |
| `LOG_LEVEL` | `info` or `warn` |
| `AUTH_COOKIE_SECURE` | `true` |
| `AUTH_COOKIE_SAME_SITE` | `lax` or `strict` |
| `AUTH_COOKIE_DOMAIN` | `.example.com` if subdomains share cookies |

**AWS credentials:** use ECS task IAM role when possible; otherwise `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` in Secrets Manager.

Full template: [`.env.docker.example`](../.env.docker.example), [`apps/backend/.env.example`](../apps/backend/.env.example).

### Web (`apps/web`)

Built at image build time:

| Variable | Production value |
|----------|------------------|
| `VITE_API_BASE_URL` | `/api/v1` (same-origin via nginx/ALB) |

Runtime: nginx only; no secrets in the web container.

### Mobile (`apps/mobile`)

Not deployed to AWS. Configure at **build time** (EAS secrets / `eas.json`):

| Variable | Example |
|----------|---------|
| `EXPO_PUBLIC_API_BASE_URL` | `https://app.example.com/api/v1` |

Physical devices must reach the public HTTPS API. Refresh tokens work via secure store + API auth endpoints ([SECURITY_CHECKLIST.md](../apps/backend/docs/SECURITY_CHECKLIST.md)).

---

## 10. Staging dry-run checklist

Complete on **staging** before first production cutover.

### Infrastructure

- [ ] VPC, subnets, NAT egress verified (Atlas IP allowlist or peering works)
- [ ] Atlas staging cluster reachable from ECS/EC2
- [ ] ElastiCache reachable from API tasks (`redis-cli -h ... -a ... PING`)
- [ ] S3 bucket private; test deny public ACL
- [ ] ACM cert issued and ALB HTTPS listener active
- [ ] Route 53 / DNS resolves staging hostname to ALB
- [ ] Secrets Manager populated; no secrets in git or task definition plaintext

### Deploy

- [ ] ECR images pushed with CI tag
- [ ] ECS services stable (2 tasks or desired count)
- [ ] GitHub **Deploy** workflow run against `staging` succeeds
- [ ] CloudWatch logs streaming from API and web tasks

### Application smoke

- [ ] `GET https://<staging-host>/` returns SPA (200)
- [ ] `GET https://<staging-host>/api/v1/health` → `database.status: up`, Redis connected if enabled
- [ ] `GET https://<staging-host>/api/v1/version` shows `production` or staging env
- [ ] Login + refresh flow works (secure cookie on HTTPS)
- [ ] CORS: web origin allowed; random origin blocked
- [ ] Document presign → PUT → confirm → download URL ([DOCUMENTS_S3_API.md](../apps/backend/docs/DOCUMENTS_S3_API.md))
- [ ] Background job spot-check (e.g. trigger a cron-dependent feature or inspect BullMQ queue in Redis)
- [ ] Mobile build against staging API (Expo profile) — login + offline queue retry

### Security

- [ ] Swagger disabled (`SWAGGER_ENABLED=false`)
- [ ] TLS 1.2+ only on ALB
- [ ] S3 Block Public Access enabled
- [ ] IAM least privilege on task roles
- [ ] GitHub production environment requires reviewer

---

## 11. Production validation checklist

Run after every production deploy (automate where possible).

### Automated smoke (run from CI or laptop)

```bash
export APP_URL=https://app.example.com

curl -fsS "${APP_URL}/api/v1/health" | jq .
curl -fsS "${APP_URL}/api/v1/version" | jq .
curl -fsS -o /dev/null -w "%{http_code}\n" "${APP_URL}/"
```

Expect health `success: true`, database `up`, HTTP 200 on `/`.

### Manual verification

- [ ] Director login on web (`CORS_ORIGINS` matches browser URL)
- [ ] Permission-gated page loads (403 without permission)
- [ ] Upload PDF/image via documents flow; download presigned URL expires
- [ ] Audit log entry created on login
- [ ] Rate limit on auth routes (429 after threshold)
- [ ] ECS deployment circuit breaker not triggered
- [ ] No secret values in CloudWatch logs
- [ ] Atlas Performance Advisor: no critical missing indexes
- [ ] Backup jobs scheduled (Atlas + ElastiCache + S3 versioning confirmed)

### Observability (recommended follow-up)

- CloudWatch alarms: ALB 5xx, ECS CPU/memory, Atlas disk, ElastiCache evictions
- Optional: Datadog / Grafana dashboards, SNS paging

---

## 12. Operational commands reference

```bash
# ECS — force redeploy after secret rotation
aws ecs update-service --cluster luxaria-production --service luxaria-api --force-new-deployment

# ECS — describe running task definition
aws ecs describe-services --cluster luxaria-production --services luxaria-api

# ECR — list recent images
aws ecr describe-images --repository-name luxaria/backend --query 'sort_by(imageDetails,& imagePushedAt)[-5:]'

# Logs
aws logs tail /ecs/luxaria-api --follow

# Local prod-like stack (developer sanity check — not AWS)
cp .env.docker.example .env.docker   # fill secrets locally only
docker compose -f docker-compose.prod.yml up -d --build
curl -fsS http://localhost:9001/api/v1/health
```

---

## 13. Decision log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | MongoDB Atlas | Replica set, backups, transactions ([MONGODB_ATLAS.md](../apps/backend/docs/MONGODB_ATLAS.md)) |
| Cache / jobs | ElastiCache Redis | `REDIS_ENABLED` + BullMQ in backend |
| Files | Private S3 + presign | [DOCUMENTS_S3_API.md](../apps/backend/docs/DOCUMENTS_S3_API.md) |
| Compute | ECS Fargate | Matches Dockerfiles; rolling deploys |
| TLS | ACM + ALB | Managed certs, HSTS at edge |
| Secrets | Secrets Manager + GitHub Environments | No secrets in repo |
| Mobile | Expo / EAS | Client app; API only on AWS |

---

## 14. Out of scope (this phase)

- Terraform/CDK modules (add in a follow-up infra phase)
- WAF, GuardDuty, SOC2 evidence pack
- Multi-region active-active
- Product UI changes

---

*Micro Phase 139 — AWS production deployment runbook. Last updated with repo at deploy time.*

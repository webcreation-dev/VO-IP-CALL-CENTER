# Asterisk VoIP Call Center API v2

Multi-tenant VoIP Call Center Management API built with NestJS, TypeORM, and Asterisk (AMI/ARI).

## 🚀 Features

- **Multi-Tenant Architecture** with automatic tenant prefixing (`t{tenant_id}_`)
- **RESTful API** with OpenAPI/Swagger documentation
- **JWT Authentication** with role-based access control (RBAC)
- **Asterisk Integration** via AMI (Manager Interface) and ARI (REST Interface)
- **Real-time Monitoring** of queues, endpoints, and calls
- **PostgreSQL Database** with TypeORM and migrations
- **Redis Caching** for performance optimization
- **Winston Logging** with structured logs
- **Security** with Helmet, CORS, rate limiting, and input validation

## 📋 Tech Stack

- **Framework**: NestJS 11
- **Language**: TypeScript
- **Database**: PostgreSQL 14+
- **ORM**: TypeORM
- **Cache**: Redis
- **Asterisk**: AMI + ARI
- **Authentication**: JWT + Passport
- **Documentation**: Swagger/OpenAPI
- **Logging**: Winston

## 🏗️ Architecture

```
src/
├── core/                          # Infrastructure/Utility services
│   ├── database/                  # TypeORM configuration & entities
│   │   ├── entities/              # Database entities
│   │   └── migrations/            # Database migrations
│   ├── asterisk/
│   │   ├── ami/                   # AMI service (Manager Interface)
│   │   └── ari/                   # ARI service (REST Interface)
│   ├── cache/                     # Redis cache service
│   └── logger/                    # Winston logger service
│
├── common/                        # Shared utilities
│   ├── decorators/                # Custom decorators (@CurrentUser, @CurrentTenant, etc.)
│   ├── guards/                    # Auth guards (JWT, Roles, Tenant Isolation)
│   ├── interceptors/              # Response transformation, logging
│   ├── filters/                   # Exception filters
│   ├── pipes/                     # Validation pipes
│   ├── utils/                     # Helper functions (tenant prefixing, pagination)
│   ├── dto/                       # Common DTOs
│   ├── interfaces/                # TypeScript interfaces
│   └── enums/                     # Enums (UserRole, etc.)
│
├── modules/                       # Business logic modules
│   ├── auth/                      # Authentication & authorization
│   ├── tenants/                   # Tenant management
│   ├── endpoints/                 # SIP endpoints (PJSIP)
│   ├── queues/                    # Queue management
│   └── queue-members/             # Queue member management
│
├── config/                        # Configuration files
│   ├── configuration.ts           # Environment configuration
│   └── validation.schema.ts       # Joi validation schema
│
├── app.module.ts                  # Root module
└── main.ts                        # Application entry point
```

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+
- Asterisk 18+ with AMI and ARI enabled

### 1. Clone and Install Dependencies

```bash
cd /home/kamgoko/Projects2025/asterisk/asterisk-api-v2
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

**Required environment variables:**

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=asterisk
DB_USER=asterisk
DB_PASSWORD=your_password

# AMI
AMI_HOST=localhost
AMI_PORT=5038
AMI_USER=admin
AMI_PASSWORD=your_ami_password

# ARI
ARI_HOST=localhost
ARI_PORT=8088
ARI_USER=asterisk
ARI_PASSWORD=your_ari_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key-min-32-chars-long
JWT_EXPIRES_IN=1d

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

### 3. Run Database Migrations

```bash
# Run migrations
npm run migration:run

# Revert last migration (if needed)
npm run migration:revert
```

### 4. Start the Application

```bash
# Development mode (with hot reload)
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The API will be available at:
- API: `http://localhost:3000/api/v1`
- Swagger Documentation: `http://localhost:3000/api/docs`

## 🗄️ Database Migrations

The project includes 3 migrations:

1. **EnrichTenantsTable** - Adds company info, limits, timezone to tenants
2. **CreateAppUsersTable** - Creates app_users table with role-based auth
3. **AddMultiTenantSupport** - Adds display_name columns and tenant_id to all entities

### Creating New Migrations

```bash
# Generate migration from entity changes
npm run migration:generate -- src/core/database/migrations/MigrationName

# Create empty migration
npm run migration:create -- src/core/database/migrations/MigrationName
```

## 🔐 Authentication & Authorization

### User Roles

- **admin**: Global access to all tenants
- **tenant_admin**: Full access to own tenant
- **supervisor**: Read-only access + real-time monitoring
- **agent**: Limited access, can manage own status

### JWT Token Structure

```json
{
  "sub": 1,
  "email": "user@example.com",
  "role": "tenant_admin",
  "tenantId": 1,
  "iat": 1234567890,
  "exp": 1234654290
}
```

### Protected Endpoints

Use decorators to protect endpoints:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.TENANT_ADMIN)
@Get()
findAll(@CurrentUser() user, @CurrentTenant() tenantId) {
  // ...
}
```

## 🏢 Multi-Tenant Design

All entities use automatic tenant prefixing:

| Entity | User Input | Stored in DB | Asterisk Sees |
|--------|-----------|--------------|---------------|
| Queue | `support` | `t1_support` | `t1_support` |
| Endpoint | `101` | `t1_101` | `t1_101` |
| Auth | `101` | `t1_101` | `t1_101` |
| AOR | `101` | `t1_101` | `t1_101` |

**Benefits:**
- ✅ Complete isolation between tenants
- ✅ Same names allowed across tenants
- ✅ Transparent for end-users (UI shows "support", not "t1_support")

## 📡 Asterisk Integration

### AMI (Asterisk Manager Interface)

Used for:
- Queue operations (add/remove members, pause/unpause)
- Queue statistics (calls, members, status)
- Endpoint status monitoring
- Module reloading

### ARI (Asterisk REST Interface)

Used for:
- Channel management (originate, hangup, answer)
- Bridge operations (conference calls)
- Playback and recording
- Real-time call control

### Example Usage

```typescript
// In your service
constructor(
  private amiService: AmiService,
  private ariService: AriService,
) {}

// Get queue status via AMI
const queueStatus = await this.amiService.getQueueStatus('t1_support');

// Originate call via ARI
const channel = await this.ariService.originateCall({
  endpoint: 'PJSIP/t1_101',
  extension: '1000',
  context: 't1_default',
});
```

## 🔄 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get JWT token
- `GET /api/v1/auth/me` - Get current user info

### Tenants
- `GET /api/v1/tenants` - List tenants (admin only)
- `POST /api/v1/tenants` - Create tenant (admin only)
- `GET /api/v1/tenants/:id` - Get tenant details
- `PUT /api/v1/tenants/:id` - Update tenant (admin only)
- `DELETE /api/v1/tenants/:id` - Delete tenant (admin only)

### Endpoints (SIP)
- `GET /api/v1/endpoints` - List endpoints (filtered by tenant)
- `POST /api/v1/endpoints` - Create endpoint (with auth/aor)
- `GET /api/v1/endpoints/:id` - Get endpoint details
- `GET /api/v1/endpoints/:id/status` - Get real-time status (AMI)
- `PUT /api/v1/endpoints/:id` - Update endpoint
- `DELETE /api/v1/endpoints/:id` - Delete endpoint
- `POST /api/v1/endpoints/:id/disconnect` - Disconnect endpoint

### Queues
- `GET /api/v1/queues` - List queues (filtered by tenant)
- `GET /api/v1/queues/enriched` - List with real-time stats
- `POST /api/v1/queues` - Create queue
- `GET /api/v1/queues/:name` - Get queue details
- `GET /api/v1/queues/:name/stats` - Get real-time stats (AMI)
- `GET /api/v1/queues/:name/calls` - Get waiting calls
- `PUT /api/v1/queues/:name` - Update queue
- `DELETE /api/v1/queues/:name` - Delete queue
- `POST /api/v1/queues/:name/reload` - Reload queue config

### Queue Members
- `GET /api/v1/queues/:queueName/members` - List members
- `POST /api/v1/queues/:queueName/members` - Add member
- `DELETE /api/v1/queues/:queueName/members/:interface` - Remove member
- `PUT /api/v1/queues/:queueName/members/:interface/pause` - Pause member
- `PUT /api/v1/queues/:queueName/members/:interface/unpause` - Unpause member
- `PUT /api/v1/queues/:queueName/members/:interface/penalty` - Update penalty

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 🐳 Docker Deployment

```bash
# Build image
docker build -t asterisk-api-v2 .

# Run with docker-compose
docker-compose up -d
```

## 📝 Development Guidelines

### Code Style

- Use Prettier for formatting: `npm run format`
- Use ESLint for linting: `npm run lint`
- Follow NestJS conventions and best practices

### Creating New Modules

```bash
# Generate module with CLI
nest generate module modules/my-module
nest generate controller modules/my-module
nest generate service modules/my-module
```

### Tenant Prefixing

Always use `TenantPrefixUtil` for entity names:

```typescript
import { TenantPrefixUtil } from 'src/common/utils/tenant-prefix.util';

// Add prefix
const prefixed = TenantPrefixUtil.addPrefix(tenantId, 'support'); // "t1_support"

// Remove prefix
const { tenantId, name } = TenantPrefixUtil.removePrefix('t1_support');
```

## 📚 Documentation

- **Swagger UI**: Available at `/api/docs` when running
- **Architecture Decisions**: See `/docs/ADR/` folder
- **API Reference**: Auto-generated from code via Swagger decorators

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Commit changes: `git commit -am 'Add my feature'`
3. Push to branch: `git push origin feature/my-feature`
4. Create Pull Request

## 📄 License

Private - All Rights Reserved

## 🆘 Support

For issues and questions:
- Create an issue in the repository
- Contact the development team

---

**Built with ❤️ using NestJS and TypeScript**

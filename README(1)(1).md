# 🏥 Pharma Inventory & Multi-Warehouse Batch Tracking System

> An industrial-grade pharmaceutical inventory management system focused on batch-level tracking, multi-warehouse operations, and regulatory compliance through workflow-based processes.

[![Status: In Development](https://img.shields.io/badge/Status-In%20Development-yellow.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Docker](https://img.shields.io/badge/docker-enabled-blue.svg)](https://www.docker.com/)

> **⚠️ Project Status**: This project is currently in **Phase 1 - Foundation**. The architecture and features described below represent a carefully scoped, buildable system focused on demonstrating industrial software engineering practices.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Current Status](#-current-status)
- [Why This Project?](#-why-this-project)
- [Core Features](#-core-features)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Database Schema](#-database-schema)
- [API Documentation](#-api-documentation)
- [Installation](#-installation)
- [Development Roadmap](#-development-roadmap)
- [Security](#-security)
- [Contributing](#-contributing)
- [Contact](#-contact)

---

## 📊 Current Status

**Development Phase**: Foundation & Core Implementation  
**Version**: 0.1.0-alpha  
**Last Updated**: February 2024

### ✅ Completed
- [x] Complete system design and architecture
- [x] Business Requirements Specification (BRS)
- [x] Software Requirements Specification (SRS)
- [x] Functional Requirements Specification (FRS)
- [x] Database schema design (normalized, transaction-safe)
- [x] API endpoint planning
- [x] Technology stack finalization

### 🚧 In Progress
- [ ] Development environment setup (Docker)
- [ ] Database implementation with migrations
- [ ] JWT Authentication system
- [ ] Role-Based Access Control (RBAC)
- [ ] User management APIs

### 📋 Next Up
- Medicine & Batch management module
- Multi-warehouse inventory tracking
- Stock transfer with transaction safety
- Stock movement ledger
- Recall approval workflow

---

## 🎯 Overview

### The Problem
Pharmaceutical inventory management requires:
- **Batch-level tracking** (not just product-level) for recalls
- **Multi-warehouse coordination** with transfer consistency
- **Audit trails** for regulatory compliance
- **Approval workflows** for critical operations
- **Zero stock inconsistencies** through transactional safety

Traditional inventory systems treat these as afterthoughts. This system makes them foundational.

### The Solution
A focused system built around **6 core industrial capabilities**:

1. **JWT Authentication + RBAC** - Industry-standard security
2. **Batch-Level Inventory** - Track every batch uniquely across warehouses
3. **Multi-Warehouse Transfers** - Transaction-safe stock movement
4. **Stock Movement Ledger** - Complete audit trail for compliance
5. **Recall Approval Workflow** - Manager request → Admin approval → Batch blocking
6. **Query-Based Alerts** - Expiry and low-stock detection without background jobs

This isn't a feature-packed prototype. It's a **production-thinking system** with deep implementation of workflow-based, non-CRUD business logic.

---

## ✨ Core Features

### 🔐 1. Authentication & Authorization
**Status**: 🚧 In Progress

- **JWT-based authentication** with token expiration
- **Role-Based Access Control (RBAC)**: Admin, Warehouse Manager, Staff, Auditor
- **bcrypt password hashing** for security
- **Token refresh mechanism** for session management

**Why it matters**: Foundation for multi-user enterprise system. Shows understanding of stateless authentication and authorization.

---

### 💊 2. Medicine & Batch Management
**Status**: 📋 Planned

#### Medicine Catalog
- Unique medicine records with manufacturer details
- Storage type classification (refrigerated, room temp, etc.)
- Minimum stock threshold per medicine
- Category management

#### Batch Tracking
- **Unique batch numbers** per medicine
- Manufacture and expiry date tracking
- Total quantity per batch
- Batch-to-batch variance support

**Why it matters**: Demonstrates understanding that pharma tracks batches, not just products. Critical for recall scenarios.

---

### 🏭 3. Multi-Warehouse Inventory
**Status**: 📋 Planned

- Multiple warehouse location support
- Per-warehouse stock levels **per batch**
- Stock allocation from batch to warehouse
- Real-time available quantity tracking

**Business Logic**:
```
Total Batch Quantity ≥ Sum of All Warehouse Allocations
Warehouse Stock ≥ 0 (enforced at database level)
```

**Why it matters**: Shows distributed inventory thinking. Not just "Product X: 100 units" but "Batch B123 at Warehouse W1: 50 units".

---

### 🔄 4. Stock Transfer System (Transaction-Safe)
**Status**: 📋 Planned - **Core Complexity Feature**

#### Transfer Logic
```python
# Pseudocode showing transaction safety
BEGIN TRANSACTION
  1. Lock source warehouse stock row
  2. Validate: source_quantity >= transfer_quantity
  3. Deduct from source warehouse
  4. Add to destination warehouse
  5. Log movement in ledger
COMMIT TRANSACTION
```

#### Features
- **Database-level transactions** (ACID compliance)
- **Row-level locking** to prevent race conditions
- **Validation before transfer**: Cannot transfer more than available
- **Automatic ledger entry** creation
- **Rollback on failure** - no partial transfers

**Why it matters**: 
- Demonstrates concurrency handling
- Shows understanding of database transactions
- Real-world business logic (not CRUD)
- Interview-impressive complexity

---

### 📝 5. Stock Movement Ledger
**Status**: 📋 Planned

Every stock change creates an **immutable audit record**:

| Field | Purpose |
|-------|---------|
| Batch ID | Which batch moved |
| Warehouse ID | Location of movement |
| Movement Type | `ALLOCATION`, `DISPATCH`, `TRANSFER_OUT`, `TRANSFER_IN` |
| Quantity | Amount moved (signed: +/- ) |
| User ID | Who performed the action |
| Timestamp | When it happened |
| Reference ID | Links related movements (e.g., transfer pair) |

**Key Properties**:
- **Append-only** (no updates/deletes)
- **Complete traceability** of all stock changes
- **Regulatory compliance** ready
- **Balance reconstruction** possible from ledger

**Why it matters**: Shows understanding of audit requirements and event sourcing principles. Not just "current state" but "history of all changes".

---

### 🚨 6. Recall Approval Workflow
**Status**: 📋 Planned - **Non-CRUD Business Logic**

#### Workflow States
```
Manager → Submits Recall Request → PENDING
Admin → Reviews Request → APPROVED / REJECTED
If APPROVED → Batch Marked as Recalled → Dispatch Blocked
```

#### Process
1. **Manager submits** recall request with reason
2. **Admin reviews** request with batch details
3. **Approval action**:
   - Batch flagged as `is_recalled = TRUE`
   - All warehouses notified
   - Future dispatch attempts blocked
   - Ledger entry created
4. **Rejection action**:
   - Request marked rejected with reason
   - No batch changes

**Why it matters**:
- Demonstrates **workflow-based system design**
- Shows state management (pending → approved/rejected)
- Real business process automation
- Not CRUD - requires thinking about process flow

---

### ⚠️ 7. Alert System (Query-Based)
**Status**: 📋 Planned

#### Expiry Alerts
```sql
-- Calculated on-demand, no background jobs
SELECT * FROM batches 
WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
AND is_recalled = FALSE
```

#### Low Stock Alerts
```sql
-- Per medicine across all warehouses
SELECT medicine_id, SUM(quantity) as total_stock
FROM warehouse_stock
GROUP BY medicine_id
HAVING SUM(quantity) < (SELECT min_threshold FROM medicines WHERE id = medicine_id)
```

**Approach**: 
- Alerts calculated **on page load** or API request
- No WebSockets, no Celery, no distributed complexity
- Simple, reliable, debuggable

**Why it matters**: Shows practical engineering judgment. Polling every 30 seconds is perfectly acceptable for this use case. No need for over-engineering.

---

## 🏗️ System Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────┐
│                  Frontend (HTML/CSS/JS)              │
│              Simple Dashboard, No Framework          │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────┐
│                API Gateway (FastAPI)                 │
│            JWT Middleware + RBAC Decorator           │
└────────┬─────────────────────────────────┬──────────┘
         │                                   │
         ▼                                   ▼
┌──────────────────┐              ┌──────────────────┐
│  Authentication  │              │  Business Logic  │
│     Service      │              │     Modules      │
│                  │              │                  │
│ - JWT Generate   │              │ - Medicine CRUD  │
│ - JWT Validate   │              │ - Batch CRUD     │
│ - Password Hash  │              │ - Stock Allocate │
│ - RBAC Check     │              │ - Stock Transfer │
└──────────────────┘              │ - Movement Log   │
                                  │ - Recall Workflow│
                                  └─────────┬────────┘
                                            │
                    ┌───────────────────────┴─────────────┐
                    ▼                                     ▼
         ┌────────────────────┐              ┌──────────────────┐
         │  PostgreSQL 14+    │              │   Redis 6+       │
         │                    │              │                  │
         │ - User data        │              │ - Session cache  │
         │ - Medicine/Batch   │              │ - Query cache    │
         │ - Warehouse Stock  │              │ - (Optional)     │
         │ - Movement Ledger  │              └──────────────────┘
         │ - Recall Requests  │
         │                    │
         │ Transaction-Safe   │
         │ Row-Level Locking  │
         └────────────────────┘
```

### Component Responsibilities

| Component | Technology | Responsibility |
|-----------|-----------|----------------|
| **API Layer** | FastAPI | RESTful endpoints, request validation, JWT middleware |
| **Auth Service** | JWT + bcrypt | Token generation/validation, password security |
| **Business Logic** | Python modules | Core inventory operations, workflow management |
| **Database** | PostgreSQL 14+ | Persistent storage, ACID transactions, row locking |
| **Cache** | Redis (optional) | Session storage, query result caching |
| **Frontend** | HTML/CSS/JS | Dashboard, forms, simple UI (no React/Vue) |

### Why This Stack?

- **FastAPI**: Modern, fast, excellent for APIs, automatic OpenAPI docs
- **PostgreSQL**: ACID compliance, row-level locking, JSON support, proven reliability
- **Redis**: Simple caching, no distributed complexity needed
- **No Celery**: Background jobs add deployment complexity we don't need
- **No WebSocket**: Polling is sufficient for this use case
- **No ORMs complexity**: Use SQLAlchemy simply, avoid over-abstraction

---

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI 0.104+
- **Language**: Python 3.10+
- **Database**: PostgreSQL 14+
- **Caching**: Redis 6+ (optional for Phase 2)
- **Auth**: JWT (PyJWT)
- **Password**: bcrypt

### Frontend
- **Core**: HTML5, CSS3, Vanilla JavaScript
- **UI Framework**: None (keeping it simple)
- **HTTP Client**: Fetch API
- **Future**: May add Tailwind CSS for styling

### Development Tools
- **Containerization**: Docker & Docker Compose
- **API Documentation**: FastAPI automatic OpenAPI (Swagger)
- **Database Migrations**: Alembic
- **Testing**: pytest (unit + integration)
- **Code Quality**: Black (formatter), Flake8 (linter)

### Deployment (Planned)
- **Platform**: AWS EC2 / DigitalOcean
- **Web Server**: Nginx (reverse proxy)
- **App Server**: Uvicorn/Gunicorn
- **Database**: Managed PostgreSQL
- **SSL**: Let's Encrypt

---

## 🗄️ Database Schema (Design)

### Core Tables

```sql
-- Users and Authentication
users
  - id (PK)
  - email (UNIQUE, NOT NULL)
  - password_hash (NOT NULL)
  - role_id (FK → roles.id)
  - is_active (BOOLEAN, DEFAULT TRUE)
  - created_at (TIMESTAMP)

roles
  - id (PK)
  - name (UNIQUE) -- 'admin', 'warehouse_manager', 'staff', 'auditor'
  - description

-- Medicine Catalog
medicines
  - id (PK)
  - name (UNIQUE, NOT NULL)
  - manufacturer
  - category
  - storage_type
  - min_stock_threshold (INTEGER, DEFAULT 10)
  - created_at

-- Batch Tracking (Core Entity)
batches
  - id (PK)
  - batch_number (UNIQUE, NOT NULL)
  - medicine_id (FK → medicines.id)
  - manufacture_date (DATE, NOT NULL)
  - expiry_date (DATE, NOT NULL, CHECK: expiry > manufacture)
  - total_quantity (INTEGER, NOT NULL, CHECK: >= 0)
  - is_recalled (BOOLEAN, DEFAULT FALSE)
  - created_at

-- Warehouse Locations
warehouses
  - id (PK)
  - name (UNIQUE, NOT NULL)
  - location
  - created_at

-- Multi-Warehouse Stock (Critical Table)
warehouse_stock
  - id (PK)
  - warehouse_id (FK → warehouses.id)
  - batch_id (FK → batches.id)
  - quantity (INTEGER, NOT NULL, CHECK: >= 0)
  - updated_at
  - UNIQUE(warehouse_id, batch_id)  -- One record per batch per warehouse

-- Audit Trail (Append-Only)
stock_movements
  - id (PK)
  - batch_id (FK → batches.id)
  - warehouse_id (FK → warehouses.id)
  - movement_type (ENUM: 'ALLOCATION', 'DISPATCH', 'TRANSFER_OUT', 'TRANSFER_IN')
  - quantity (INTEGER, signed)
  - user_id (FK → users.id)
  - reference_id (UUID, for linking transfer pairs)
  - notes (TEXT)
  - created_at (TIMESTAMP, NOT NULL)

-- Recall Workflow
recall_requests
  - id (PK)
  - batch_id (FK → batches.id)
  - requested_by (FK → users.id, role: manager)
  - reason (TEXT, NOT NULL)
  - status (ENUM: 'PENDING', 'APPROVED', 'REJECTED')
  - reviewed_by (FK → users.id, role: admin, NULL if pending)
  - review_notes (TEXT)
  - created_at
  - updated_at
```

### Key Constraints & Indexes

```sql
-- Prevent negative stock
CHECK (warehouse_stock.quantity >= 0)

-- Prevent over-allocation
-- Handled at application level with transaction

-- Fast lookups
CREATE INDEX idx_batches_expiry ON batches(expiry_date) WHERE is_recalled = FALSE;
CREATE INDEX idx_warehouse_stock_batch ON warehouse_stock(batch_id);
CREATE INDEX idx_stock_movements_batch ON stock_movements(batch_id);
CREATE INDEX idx_recall_status ON recall_requests(status) WHERE status = 'PENDING';
```

### Transaction Safety Example

```sql
-- Transfer 50 units from Warehouse A to Warehouse B
BEGIN;

-- Lock rows to prevent concurrent modification
SELECT * FROM warehouse_stock 
WHERE warehouse_id = 'A' AND batch_id = '123' 
FOR UPDATE;

SELECT * FROM warehouse_stock 
WHERE warehouse_id = 'B' AND batch_id = '123' 
FOR UPDATE;

-- Validate source has enough
-- (Application checks this before proceeding)

-- Deduct from source
UPDATE warehouse_stock 
SET quantity = quantity - 50, updated_at = NOW()
WHERE warehouse_id = 'A' AND batch_id = '123';

-- Add to destination
UPDATE warehouse_stock 
SET quantity = quantity + 50, updated_at = NOW()
WHERE warehouse_id = 'B' AND batch_id = '123';

-- Log both movements
INSERT INTO stock_movements (batch_id, warehouse_id, movement_type, quantity, user_id, reference_id)
VALUES ('123', 'A', 'TRANSFER_OUT', -50, 'user123', 'ref-uuid');

INSERT INTO stock_movements (batch_id, warehouse_id, movement_type, quantity, user_id, reference_id)
VALUES ('123', 'B', 'TRANSFER_IN', 50, 'user123', 'ref-uuid');

COMMIT;
```

---

## 📚 API Documentation (Planned)

### Base URL
```
http://localhost:8000/api/v1
```

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user (admin only) | Yes (Admin) |
| POST | `/auth/login` | Login and get JWT token | No |
| POST | `/auth/refresh` | Refresh JWT token | Yes |
| POST | `/auth/logout` | Invalidate token | Yes |

### Medicine Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/medicines` | List all medicines | Yes |
| POST | `/medicines` | Create medicine | Yes (Admin) |
| GET | `/medicines/{id}` | Get medicine details | Yes |
| PUT | `/medicines/{id}` | Update medicine | Yes (Admin) |
| DELETE | `/medicines/{id}` | Soft delete medicine | Yes (Admin) |

### Batch Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/batches` | List batches (with filters) | Yes |
| POST | `/batches` | Create new batch | Yes (Manager+) |
| GET | `/batches/{id}` | Get batch details | Yes |
| PUT | `/batches/{id}` | Update batch info | Yes (Manager+) |
| GET | `/batches/{id}/stock` | Get stock across warehouses | Yes |

### Warehouse Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/warehouses` | List all warehouses | Yes |
| POST | `/warehouses` | Create warehouse | Yes (Admin) |
| GET | `/warehouses/{id}` | Get warehouse details | Yes |
| GET | `/warehouses/{id}/stock` | Get all stock in warehouse | Yes |

### Stock Operations

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/stock/allocate` | Allocate batch to warehouse | Yes (Manager+) |
| POST | `/stock/dispatch` | Dispatch stock from warehouse | Yes (Manager+) |
| POST | `/stock/transfer` | Transfer between warehouses | Yes (Manager+) |
| GET | `/stock/movements` | Get movement history | Yes |
| GET | `/stock/movements/batch/{id}` | Movements for specific batch | Yes |

### Recall Workflow

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/recalls` | Submit recall request | Yes (Manager) |
| GET | `/recalls` | List recall requests | Yes |
| GET | `/recalls/{id}` | Get recall details | Yes |
| PUT | `/recalls/{id}/approve` | Approve recall | Yes (Admin) |
| PUT | `/recalls/{id}/reject` | Reject recall | Yes (Admin) |

### Alerts (Query-Based)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/alerts/expiry` | Get batches expiring soon | Yes |
| GET | `/alerts/low-stock` | Get medicines below threshold | Yes |

### Example Request/Response

**Login**
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "manager@pharma.com",
  "password": "SecurePass123!"
}

# Response
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "manager@pharma.com",
    "role": "warehouse_manager"
  }
}
```

**Transfer Stock**
```bash
POST /api/v1/stock/transfer
Authorization: Bearer <token>
Content-Type: application/json

{
  "batch_id": "batch-uuid",
  "source_warehouse_id": "warehouse-1",
  "destination_warehouse_id": "warehouse-2",
  "quantity": 100
}

# Response
{
  "success": true,
  "transfer_id": "transfer-uuid",
  "movements": [
    {
      "id": "movement-1",
      "warehouse_id": "warehouse-1",
      "type": "TRANSFER_OUT",
      "quantity": -100
    },
    {
      "id": "movement-2",
      "warehouse_id": "warehouse-2",
      "type": "TRANSFER_IN",
      "quantity": 100
    }
  ],
  "timestamp": "2024-02-24T10:30:00Z"
}
```

---

## 🚀 Installation

> **Note**: Setup instructions for development environment. Some features are still being implemented.

### Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- Python 3.10+ (for local development)
- PostgreSQL 14+ (or use Docker)
- Git

### Quick Start with Docker

```bash
# 1. Clone repository
git clone https://github.com/yourusername/pharma-inventory-system.git
cd pharma-inventory-system

# 2. Create environment file
cp .env.example .env
# Edit .env with your settings

# 3. Start containers
docker-compose up -d

# 4. Run migrations (once implemented)
docker-compose exec api alembic upgrade head

# 5. Create initial admin user (once implemented)
docker-compose exec api python scripts/create_admin.py

# 6. Access application
# API: http://localhost:8000
# API Docs: http://localhost:8000/docs
# Frontend: http://localhost:3000
```

### Local Development Setup

```bash
# 1. Clone and enter directory
git clone https://github.com/yourusername/pharma-inventory-system.git
cd pharma-inventory-system

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Setup PostgreSQL database
createdb pharma_inventory

# 5. Configure environment
cp .env.example .env
# Edit .env with your database credentials

# 6. Run migrations
alembic upgrade head

# 7. Start development server
uvicorn main:app --reload --port 8000

# API available at http://localhost:8000
# Interactive docs at http://localhost:8000/docs
```

### Environment Variables

Create `.env` file:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pharma_inventory

# JWT
JWT_SECRET_KEY=your-super-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=1

# Application
DEBUG=True
API_PORT=8000

# Redis (Optional - Phase 2)
REDIS_URL=redis://localhost:6379/0

# Alerts
EXPIRY_WARNING_DAYS=30
LOW_STOCK_MULTIPLIER=0.2
```

---

## 🗺️ Development Roadmap

### Phase 1: Foundation (Months 1-2) ⏳ IN PROGRESS
**Goal**: Authentication, database, and basic API structure

#### Week 1-2: Setup
- [x] Project structure and requirements
- [x] Database schema design
- [ ] Docker environment configuration
- [ ] PostgreSQL setup with migrations (Alembic)
- [ ] FastAPI project skeleton
- [ ] API documentation auto-generation

#### Week 3-4: Authentication
- [ ] User model and database table
- [ ] JWT token generation and validation
- [ ] Password hashing with bcrypt
- [ ] Login/register endpoints
- [ ] JWT middleware for protected routes

#### Week 5-6: RBAC
- [ ] Role model and permissions mapping
- [ ] RBAC decorator for endpoints
- [ ] Admin user creation script
- [ ] Role-based endpoint access testing

#### Week 7-8: Medicine & Batch CRUD
- [ ] Medicine model and endpoints (CRUD)
- [ ] Batch model and endpoints (CRUD)
- [ ] Input validation with Pydantic
- [ ] Unit tests for business logic

**Phase 1 Success Criteria**:
- ✅ User can register and login
- ✅ JWT tokens working correctly
- ✅ RBAC protecting endpoints by role
- ✅ Medicines and batches can be created/viewed
- ✅ All CRUD operations tested

---

### Phase 2: Core Inventory (Months 3-4)
**Goal**: Multi-warehouse stock and movement tracking

#### Week 9-10: Warehouse Management
- [ ] Warehouse model and CRUD endpoints
- [ ] Stock allocation from batch to warehouse
- [ ] Warehouse stock view endpoints
- [ ] Validation: allocation <= batch total quantity

#### Week 11-12: Stock Transfers (Critical Feature)
- [ ] Transfer endpoint with transaction safety
- [ ] Database row-level locking implementation
- [ ] Source validation (enough stock?)
- [ ] Destination stock update
- [ ] Automatic movement ledger entries
- [ ] Rollback testing for failure scenarios

#### Week 13-14: Movement Ledger
- [ ] Stock movement model (append-only)
- [ ] Movement creation on every operation
- [ ] Movement history API endpoints
- [ ] Filter by batch, warehouse, date range
- [ ] Ledger reconstruction testing

#### Week 15-16: Testing & Refinement
- [ ] Integration tests for transfer workflow
- [ ] Concurrent transfer testing (race conditions)
- [ ] API documentation completion
- [ ] Error handling standardization

**Phase 2 Success Criteria**:
- ✅ Stock can be allocated to warehouses
- ✅ Transfers work with full transaction safety
- ✅ No race conditions under concurrent load
- ✅ Complete audit trail in movement ledger
- ✅ Stock balances always correct

---

### Phase 3: Workflow & Alerts (Months 5-6)
**Goal**: Recall approval process and alert system

#### Week 17-18: Recall Workflow
- [ ] Recall request model and submission endpoint
- [ ] Manager: submit recall with reason
- [ ] Admin: view pending recalls
- [ ] Admin: approve/reject endpoints
- [ ] Batch flagging on approval (is_recalled = TRUE)
- [ ] Dispatch blocking for recalled batches

#### Week 19-20: Alert System
- [ ] Expiry alert query endpoint (30-day window)
- [ ] Low stock alert query endpoint
- [ ] Dashboard alert polling (frontend)
- [ ] Alert count badges
- [ ] Alert filtering and sorting

#### Week 21-22: Frontend Development
- [ ] Login/register pages
- [ ] Dashboard with role-based views
- [ ] Medicine and batch management pages
- [ ] Stock allocation and transfer forms
- [ ] Recall request and approval interface
- [ ] Alert notifications display

#### Week 23-24: Polish & Testing
- [ ] End-to-end workflow testing
- [ ] UI/UX improvements
- [ ] Mobile responsiveness
- [ ] Error message improvements
- [ ] Loading states and user feedback

**Phase 3 Success Criteria**:
- ✅ Recall workflow end-to-end functional
- ✅ Alerts displayed on dashboard
- ✅ Frontend usable for all core operations
- ✅ System tested with real-world scenarios

---

### Phase 4: Deployment & Documentation (Month 7)
**Goal**: Production-ready deployment

#### Week 25-26: Deployment Preparation
- [ ] Production environment configuration
- [ ] Database backup and restore testing
- [ ] Security audit (OWASP top 10)
- [ ] HTTPS/TLS setup
- [ ] Environment variable management

#### Week 27-28: Deployment
- [ ] Cloud platform setup (AWS/DigitalOcean)
- [ ] Nginx reverse proxy configuration
- [ ] PostgreSQL managed instance
- [ ] Application deployment
- [ ] Monitoring and logging setup
- [ ] Domain and SSL certificate

**Phase 4 Success Criteria**:
- ✅ Application live on public URL
- ✅ HTTPS working correctly
- ✅ Database backed up
- ✅ System stable and tested

---

### Timeline Summary

| Phase | Duration | Focus | Status |
|-------|----------|-------|--------|
| Phase 1 | Months 1-2 | Auth, RBAC, Basic CRUD | 🟡 In Progress |
| Phase 2 | Months 3-4 | Inventory, Transfers, Ledger | ⚪ Planned |
| Phase 3 | Months 5-6 | Workflow, Alerts, Frontend | ⚪ Planned |
| Phase 4 | Month 7 | Deployment, Documentation | ⚪ Planned |

**Total Timeline**: 7 months to production-ready system

---

### What's NOT Included (Deliberately Scoped Out)

These features were considered but removed to keep the project realistic:

❌ **Temperature Monitoring**: Real-time sensor data adds unnecessary complexity  
❌ **WebSocket Real-Time Alerts**: Polling is sufficient and simpler  
❌ **Celery Background Jobs**: Query-based alerts work fine  
❌ **Health Monitoring Dashboard**: Not needed for MCA portfolio  
❌ **AI Forecasting**: Out of scope for this project  
❌ **Blockchain Tracking**: Buzzword, not practical here  
❌ **Mobile Apps**: Web-first approach

**Why these were removed**: To focus on deep implementation of core features rather than shallow implementation of many features.

---

## 🔒 Security

### Implemented Security Measures

#### Authentication
- **JWT Tokens**: Stateless authentication with 1-hour expiration
- **bcrypt Hashing**: Password security with salt (12 rounds)
- **Token Refresh**: Secure session management
- **HTTPS Only**: All production traffic encrypted (planned)

#### Authorization
- **Role-Based Access Control**: Four distinct roles with specific permissions
- **Endpoint Protection**: Decorators enforce role requirements
- **Resource Ownership**: Users can only access their permitted resources

#### Database Security
- **SQL Injection Prevention**: Parameterized queries via SQLAlchemy
- **Transaction Safety**: ACID compliance prevents data corruption
- **Row-Level Locking**: Prevents concurrent modification issues

#### Input Validation
- **Pydantic Models**: All API inputs validated
- **Type Checking**: Strong typing prevents injection
- **Business Rule Validation**: Custom validators for domain logic

#### Audit & Compliance
- **Immutable Ledger**: All stock movements permanently recorded
- **User Attribution**: Every action tied to a user
- **Timestamp Tracking**: All changes timestamped

### Security Best Practices Followed

```python
# Example: Secure endpoint with RBAC
@router.post("/stock/transfer")
@require_role(["admin", "warehouse_manager"])  # RBAC check
async def transfer_stock(
    transfer_data: TransferRequest,  # Pydantic validation
    current_user: User = Depends(get_current_user),  # JWT auth
    db: Session = Depends(get_db)
):
    # Business logic with transaction safety
    async with db.begin():  # ACID transaction
        # ... transfer logic
    
    # Audit logging
    log_action(user=current_user, action="STOCK_TRANSFER", details=transfer_data)
```

### Planned Security Enhancements

- [ ] Rate limiting (100 requests/minute per user)
- [ ] API key authentication for external integrations
- [ ] IP whitelisting for admin endpoints
- [ ] Two-factor authentication (2FA) for admin users
- [ ] Security headers (CSP, HSTS, X-Frame-Options)
- [ ] Penetration testing before production

---

## 🧪 Testing Strategy

### Test Pyramid

```
                  /\
                 /  \
                /E2E \          < 10% - Full workflow tests
               /------\
              /        \
             /Integration\      < 30% - API + Database tests  
            /------------\
           /              \
          /   Unit Tests   \    < 60% - Business logic tests
         /------------------\
```

### Planned Test Coverage

#### Unit Tests (Target: 80%+)
- Authentication logic (JWT generation, password hashing)
- Business rule validation (stock checks, quantity validation)
- Helper functions and utilities
- Pydantic model validation

#### Integration Tests (Target: 60%+)
- API endpoint responses
- Database operations (CRUD)
- Transaction rollback scenarios
- Role-based access control

#### End-to-End Tests (Critical Paths: 100%)
- User registration → login → stock transfer → ledger check
- Recall submission → admin approval → batch blocking
- Stock dispatch with insufficient quantity (error handling)

### Example Test

```python
# tests/test_stock_transfer.py
@pytest.mark.asyncio
async def test_stock_transfer_transaction_safety():
    """Test that stock transfers are transaction-safe"""
    
    # Setup: Create batch with 100 units in Warehouse A
    batch = await create_test_batch(quantity=100)
    warehouse_a = await create_test_warehouse("A")
    warehouse_b = await create_test_warehouse("B")
    
    await allocate_stock(batch.id, warehouse_a.id, quantity=100)
    
    # Act: Transfer 50 units from A to B
    response = await client.post(
        "/api/v1/stock/transfer",
        json={
            "batch_id": str(batch.id),
            "source_warehouse_id": str(warehouse_a.id),
            "destination_warehouse_id": str(warehouse_b.id),
            "quantity": 50
        },
        headers={"Authorization": f"Bearer {manager_token}"}
    )
    
    # Assert: Transfer successful
    assert response.status_code == 200
    
    # Verify: Stock updated correctly
    stock_a = await get_warehouse_stock(warehouse_a.id, batch.id)
    stock_b = await get_warehouse_stock(warehouse_b.id, batch.id)
    
    assert stock_a.quantity == 50
    assert stock_b.quantity == 50
    
    # Verify: Ledger entries created
    movements = await get_movements(batch.id)
    assert len(movements) == 2
    assert movements[0].movement_type == "TRANSFER_OUT"
    assert movements[1].movement_type == "TRANSFER_IN"
```

---

## 🤝 Contributing

This project welcomes contributions! Whether you're interested in:

- 🐛 Reporting bugs
- 💡 Suggesting features
- 📝 Improving documentation
- 💻 Writing code
- 🧪 Adding tests
- 🎨 Improving UI/UX

### Current Focus Areas

**High Priority** (Phase 1):
- [ ] Docker Compose configuration refinement
- [ ] Alembic migration scripts
- [ ] JWT authentication implementation
- [ ] RBAC decorator development
- [ ] Unit test setup and examples

**Medium Priority** (Phase 2 Prep):
- [ ] Transaction safety patterns documentation
- [ ] Stock transfer algorithm review
- [ ] Database indexing strategy
- [ ] API error handling standardization

**Documentation Needs**:
- [ ] API usage examples
- [ ] Architecture decision records (ADRs)
- [ ] Database schema diagrams
- [ ] Deployment guides

### How to Contribute

1. **Check Issues**: Look for `good first issue` or `help wanted` labels
2. **Discuss First**: Open an issue to discuss major changes
3. **Fork & Branch**: Create a feature branch from `main`
4. **Code**: Follow PEP 8, add tests, update docs
5. **Test**: Ensure all tests pass (`pytest`)
6. **Commit**: Use clear, descriptive commit messages
7. **Pull Request**: Submit PR with detailed description

### Development Setup

```bash
# Fork and clone
git clone https://github.com/yourusername/pharma-inventory-system.git
cd pharma-inventory-system

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Run tests
pytest

# Format code
black .

# Lint
flake8 .

# Type check
mypy .
```

### Code Standards

- **Style**: PEP 8 (enforced by Black)
- **Type Hints**: Required for all functions
- **Docstrings**: Google style for all public functions
- **Tests**: Required for new features
- **Commits**: Conventional Commits format

```python
# Example: Good code style
async def transfer_stock(
    source_warehouse_id: UUID,
    destination_warehouse_id: UUID,
    batch_id: UUID,
    quantity: int,
    user_id: UUID
) -> TransferResult:
    """
    Transfer stock between warehouses with transaction safety.
    
    Args:
        source_warehouse_id: Warehouse to transfer from
        destination_warehouse_id: Warehouse to transfer to
        batch_id: Batch being transferred
        quantity: Amount to transfer
        user_id: User performing the transfer
        
    Returns:
        TransferResult containing movement IDs and updated quantities
        
    Raises:
        InsufficientStockError: If source lacks quantity
        ValidationError: If quantity <= 0 or warehouses invalid
    """
    # Implementation
```

---

## 📞 Contact

**Project Lead**: [Your Name]  
**GitHub**: [@yourusername](https://github.com/yourusername)  
**Email**: your.email@example.com  
**LinkedIn**: [Your LinkedIn](https://linkedin.com/in/yourprofile)

### Project Links

- **Repository**: https://github.com/yourusername/pharma-inventory-system
- **Issues**: https://github.com/yourusername/pharma-inventory-system/issues
- **Discussions**: https://github.com/yourusername/pharma-inventory-system/discussions
- **Project Board**: https://github.com/yourusername/pharma-inventory-system/projects

### Response Times

As a solo developer with academic commitments:
- **Issues**: Reviewed within 2-3 days
- **Pull Requests**: Reviewed within 1 week
- **Email**: Within 3-5 business days

---

## 🌟 Why This Project?

### The Problem It Solves

Pharmaceutical inventory isn't like e-commerce inventory:

| E-commerce | Pharmaceutical |
|------------|----------------|
| Track products | Track individual batches |
| Stock level matters | Batch expiry matters |
| Simple transfers | Regulatory compliance required |
| No recall complexity | Recall = legal nightmare |

**This system treats pharma inventory correctly from day one.**

### What Makes This Project Different

1. **Batch-Level Thinking**: Not "Medicine X: 500 units" but "Batch B123 of Medicine X: 100 units at Warehouse A, 50 units at Warehouse B"

2. **Transaction Safety**: Transfer logic that actually prevents race conditions and maintains consistency

3. **Workflow-Based, Not CRUD**: Recall approval process shows real business logic, not just database operations

4. **Audit-First Design**: Every stock change permanently logged for compliance

5. **Production Thinking**: Deliberately scoped to be buildable and deployable, not a feature laundry list

### For Recruiters & Hiring Managers

This project demonstrates:

✅ **System Design**: Multi-warehouse distributed inventory with consistency guarantees  
✅ **Database Expertise**: Transaction safety, row locking, normalization, audit logging  
✅ **Security**: JWT auth, RBAC, bcrypt, input validation, audit trails  
✅ **Business Logic**: Workflow processes, state management, complex validation  
✅ **Software Engineering**: Modular architecture, testability, documentation  
✅ **Realism**: Properly scoped project with honest status tracking  

**This isn't a tutorial follow-along. It's an industrial problem solved with production-grade thinking.**

### Learning Journey

Technical concepts demonstrated:

- **Authentication**: Stateless JWT with refresh tokens
- **Authorization**: Role-based access control patterns
- **Concurrency**: Database transactions and row-level locking
- **Event Sourcing**: Append-only audit ledger
- **Workflow Systems**: State machines for approval processes
- **Data Integrity**: Constraints, validation, referential integrity
- **API Design**: RESTful endpoints with proper status codes
- **Testing**: Unit, integration, and E2E testing strategies

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **FastAPI Community**: For excellent documentation and examples
- **PostgreSQL Team**: For robust, reliable database technology
- **Python Community**: For amazing ecosystem of tools

---

## 📈 Project Stats

**Current Version**: 0.1.0-alpha  
**Development Status**: Phase 1 - Foundation  
**Started**: February 2024  
**Expected Completion**: September 2024 (7 months)  
**Lines of Code**: TBD (as implementation progresses)  
**Test Coverage**: TBD (target 80%+)

---

**⭐ If you find this project interesting, please star it! Stars help increase visibility and motivate continued development.**

**🤝 Want to contribute? Check out [Contributing](#-contributing) and open an issue!**

**💼 Recruiters: This project is designed to showcase production-level thinking and industrial software engineering practices. Feel free to reach out to discuss the architecture and implementation details.**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Security](#security)
- [Performance](#performance)
- [Contributing](#contributing)
- [License](#license)

---

## 📊 Current Status

**Development Phase**: Planning & Initial Setup  
**Version**: 0.1.0-alpha  
**Last Updated**: February 2024

### ✅ Completed
- [x] Business Requirements Specification (BRS)
- [x] Software Requirements Specification (SRS)
- [x] Functional Requirements Specification (FRS)
- [x] System architecture design
- [x] Database schema design
- [x] API endpoint planning
- [x] Technology stack selection

### 🚧 In Progress
- [ ] Development environment setup
- [ ] Database implementation
- [ ] Basic authentication module
- [ ] Core API framework setup

### 📋 Planned (Not Yet Started)
- Medicine & Batch management modules
- Warehouse inventory system
- Real-time alerting system
- Temperature monitoring
- Recall workflow
- Reporting engine
- WebSocket implementation
- Frontend development

### 🎯 Current Focus
Setting up the foundational architecture and implementing the authentication and user management system. The project follows a phased development approach with emphasis on building a solid, scalable foundation.

---

## 🎯 Overview

This system is designed to address critical challenges in pharmaceutical warehouse management including:

- **Batch Traceability**: Complete tracking of medicine batches from allocation to dispatch
- **Multi-Location Management**: Centralized control across multiple warehouse locations
- **Regulatory Compliance**: Automated audit logging and compliance reporting
- **Expiry Management**: Proactive monitoring and alerting for expiring stock
- **Temperature Control**: Real-time temperature monitoring and breach detection
- **Recall Management**: Streamlined batch recall workflow with approval mechanism

### Target Business Impact

- 100% batch traceability for regulatory compliance
- Zero negative stock errors through transactional operations
- Real-time alerting capabilities
- Comprehensive audit logs for all critical actions
- Reduced expiry-related losses through proactive monitoring

---

## ✨ Planned Features

### 🔐 User Management & RBAC
- JWT-based authentication
- Role-based access control (Admin, Warehouse Manager, Staff, Auditor)
- Password encryption using bcrypt
- Session management with token expiration

### 💊 Medicine & Batch Management
- Medicine catalog with manufacturer details
- Unique batch number tracking
- Manufacture and expiry date management
- Storage type classification
- Minimum stock threshold configuration

### 🏭 Multi-Warehouse Inventory
- Multiple warehouse location support
- Real-time stock allocation and tracking
- Inter-warehouse stock transfers with distributed locking
- Transaction-safe operations preventing data inconsistencies

### 📊 Stock Movement Ledger
- Complete audit trail of all stock movements
- Movement types: Allocation, Dispatch, Transfer, Return
- User attribution for accountability
- Timestamp-based tracking

### ⚠️ Intelligent Alerting System
- **Expiry Alerts**: 30-day advance warning for expiring batches
- **Low Stock Alerts**: Automatic threshold-based notifications
- **Temperature Breach Alerts**: Real-time temperature violation detection
- **WebSocket Integration**: Instant push notifications to dashboard

### 🌡️ Temperature Monitoring
- Continuous temperature logging per batch
- Configurable temperature range validation
- Automated breach detection and logging
- Compliance violation tracking

### 🚨 Recall Workflow
- Manager-initiated recall requests
- Admin approval/rejection mechanism
- Automatic batch blocking on approval
- Multi-warehouse notification system

### 📈 Reporting & Analytics
- Expiry reports (CSV/PDF)
- Stock movement reports
- Temperature violation reports
- Recall history reports
- Customizable date range filtering

### 🔍 Audit Logging
- Comprehensive activity logging
- User action tracking with IP addresses
- Before/after value comparison
- Login attempt monitoring
- Soft delete tracking

### 💓 Health Monitoring
- Database connectivity checks
- Redis status monitoring
- Background worker health verification
- API endpoint: `/health`

---

## 🏗️ System Architecture

```
┌─────────────────┐
│   Frontend      │
│  (HTML/CSS/JS)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   API Gateway   │
│   (FastAPI)     │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    ▼         ▼          ▼          ▼
┌────────┐ ┌──────┐ ┌────────┐ ┌──────────┐
│ Auth   │ │Inven-│ │ Notif- │ │ Report   │
│Service │ │tory  │ │ication │ │ Module   │
└────────┘ └──────┘ └────────┘ └──────────┘
    │         │          │          │
    └─────────┴──────────┴──────────┘
              │
         ┌────┴────┬──────────────┐
         ▼         ▼              ▼
    ┌────────┐ ┌───────┐    ┌─────────┐
    │  DB    │ │ Redis │    │ Celery  │
    │(MySQL) │ │Cache/ │    │ Worker  │
    │        │ │Pub/Sub│    │         │
    └────────┘ └───────┘    └─────────┘
```

### Component Overview

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **API Layer** | FastAPI/Django | RESTful endpoints, request validation |
| **Authentication** | JWT | Secure token-based auth |
| **Database** | MySQL/PostgreSQL | Persistent data storage |
| **Cache** | Redis | Session cache, distributed locking |
| **Message Queue** | Redis Pub/Sub | Real-time notifications |
| **Background Jobs** | Celery | Scheduled tasks (expiry checks) |
| **WebSocket** | FastAPI WebSocket | Real-time dashboard updates |
| **Container** | Docker | Isolated deployment environment |

---

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI / Django REST Framework
- **Language**: Python 3.10+
- **Database**: MySQL 8.0+ / PostgreSQL 14+
- **Cache**: Redis 6+
- **Task Queue**: Celery
- **WebSocket**: FastAPI WebSocket

### Frontend
- **Core**: HTML5, CSS3, JavaScript (ES6+)
- **Real-time**: WebSocket Client
- **UI**: Responsive design

### DevOps
- **Containerization**: Docker & Docker Compose
- **Deployment**: AWS EC2 / Cloud Platform
- **Web Server**: Nginx (reverse proxy)
- **Process Manager**: Gunicorn / Uvicorn

### Security
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Transport Security**: HTTPS/TLS
- **Rate Limiting**: Redis-based

---

## 📦 Prerequisites

- **Docker** 20.10+
- **Docker Compose** 2.0+
- **Python** 3.10+ (for local development)
- **MySQL** 8.0+ or **PostgreSQL** 14+
- **Redis** 6+

---

## 🚀 Installation

> **Note**: Installation instructions are provided for the planned architecture. As the project is in early development, some components may not yet be functional.

### Using Docker (Recommended for Future Deployment)

```bash
# Clone the repository
git clone https://github.com/yourusername/pharma-inventory-system.git
cd pharma-inventory-system

# Copy environment template (when available)
cp .env.example .env

# Edit .env with your configuration
nano .env

# Build and start containers (once Docker setup is complete)
docker-compose up -d

# Run database migrations (once implemented)
docker-compose exec api python manage.py migrate

# Create superuser (once implemented)
docker-compose exec api python manage.py createsuperuser

# Access the application (planned endpoints)
# API: http://localhost:8000
# Frontend: http://localhost:3000
```

### Manual Installation for Development

```bash
# Clone repository
git clone https://github.com/yourusername/pharma-inventory-system.git
cd pharma-inventory-system

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies (once requirements.txt is ready)
pip install -r requirements.txt

# Setup database (instructions will be provided)
python manage.py migrate

# Create superuser (once auth system is implemented)
python manage.py createsuperuser

# Start Redis (required for caching and pub/sub)
redis-server

# Start Celery worker (for background jobs)
celery -A pharma_inventory worker -l info

# Start Celery beat (for scheduled tasks)
celery -A pharma_inventory beat -l info

# Run development server
python manage.py runserver
```

> **Development Status**: The installation process will be refined as modules are implemented. Check the repository for the latest setup instructions.

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DB_ENGINE=mysql  # or postgresql
DB_NAME=pharma_inventory
DB_USER=pharma_user
DB_PASSWORD=secure_password
DB_HOST=localhost
DB_PORT=3306

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# JWT
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=1

# Application
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1
SECRET_KEY=django-secret-key-here

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Alert Settings
EXPIRY_WARNING_DAYS=30
LOW_STOCK_THRESHOLD=10

# Email (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

---

## 📖 Usage

> **Note**: The following usage examples represent the planned functionality. Implementation is in progress.

### Admin Panel (Planned)
Will be accessible at `http://localhost:8000/admin`

**Planned Admin Capabilities:**
- User management
- Medicine catalog management
- Warehouse configuration
- Recall approval/rejection
- System-wide reporting

### Warehouse Manager Dashboard (Planned)
Will be accessible at `http://localhost:3000/dashboard`

**Planned Manager Capabilities:**
- Stock allocation and dispatch
- Inter-warehouse transfers
- Temperature logging
- Recall request submission
- Warehouse-specific reports

### API Usage Examples

> **Status**: API endpoints are in the design phase. The following examples show the planned structure.

#### Authentication (Planned)
```bash
# Login endpoint (planned)
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Expected response structure
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

#### Stock Dispatch (Planned)
```bash
# Dispatch endpoint (planned)
curl -X POST http://localhost:8000/api/stock/dispatch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": 123,
    "warehouse_id": 1,
    "quantity": 50
  }'
```

---

## 📚 API Documentation (Planned)

> **Status**: API endpoints are currently in the design phase. Full implementation pending.

### Planned Base URL
```
http://localhost:8000/api
```

### Planned Core Endpoints

> These endpoints represent the designed API structure. Implementation status varies by module.

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | User login |
| POST | `/auth/logout` | User logout |
| POST | `/auth/refresh` | Refresh token |

#### Medicines
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/medicines` | List all medicines |
| POST | `/medicines` | Create medicine |
| GET | `/medicines/{id}` | Get medicine details |
| PUT | `/medicines/{id}` | Update medicine |
| DELETE | `/medicines/{id}` | Soft delete medicine |

#### Batches
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/batches` | List all batches |
| POST | `/batches` | Create batch |
| GET | `/batches/{id}` | Get batch details |
| PUT | `/batches/{id}` | Update batch |

#### Warehouses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/warehouses` | List warehouses |
| POST | `/warehouses` | Create warehouse |
| GET | `/warehouses/{id}/stock` | Get warehouse stock |

#### Stock Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/stock/allocate` | Allocate batch to warehouse |
| POST | `/stock/dispatch` | Dispatch stock |
| POST | `/stock/transfer` | Transfer between warehouses |
| GET | `/stock/movements` | Get movement history |

#### Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/alerts` | List active alerts |
| GET | `/alerts/expiry` | Expiry alerts |
| GET | `/alerts/low-stock` | Low stock alerts |
| GET | `/alerts/temperature` | Temperature breach alerts |

#### Recalls
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/recalls` | Request recall |
| PUT | `/recalls/{id}/approve` | Approve recall (admin) |
| PUT | `/recalls/{id}/reject` | Reject recall (admin) |

#### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/expiry?format=csv` | Expiry report |
| GET | `/reports/movements?format=pdf` | Stock movement report |
| GET | `/reports/temperature` | Temperature violation report |

#### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | System health check |

### WebSocket (Planned)

> **Status**: WebSocket implementation for real-time updates is planned for Phase 2.

```javascript
// Planned WebSocket connection
const ws = new WebSocket('ws://localhost:8000/ws/alerts');

ws.onmessage = function(event) {
  const alert = JSON.parse(event.data);
  console.log('New alert:', alert);
};
```

---

## 🗄️ Database Schema (Design)

> **Status**: Database schema has been designed and is ready for implementation.

### Planned Core Entities

```sql
Users
- id (PK)
- email (unique)
- password_hash
- role_id (FK)
- created_at
- is_active

Medicines
- id (PK)
- name (unique)
- manufacturer
- category
- storage_type
- min_stock_threshold
- created_at

Batches
- id (PK)
- batch_number (unique)
- medicine_id (FK)
- manufacture_date
- expiry_date
- total_quantity
- temp_min
- temp_max
- is_recalled
- created_at

Warehouses
- id (PK)
- name
- location
- created_at

WarehouseStock
- id (PK)
- warehouse_id (FK)
- batch_id (FK)
- quantity
- updated_at
- UNIQUE(warehouse_id, batch_id)

StockMovements
- id (PK)
- batch_id (FK)
- warehouse_id (FK)
- movement_type (enum)
- quantity
- user_id (FK)
- created_at

TemperatureLogs
- id (PK)
- batch_id (FK)
- warehouse_id (FK)
- temperature
- is_violation
- logged_at

RecallRequests
- id (PK)
- batch_id (FK)
- requested_by (FK)
- reason
- status (pending/approved/rejected)
- approved_by (FK)
- created_at

AuditLogs
- id (PK)
- user_id (FK)
- action
- entity_type
- entity_id
- old_value
- new_value
- ip_address
- created_at

Alerts
- id (PK)
- alert_type (enum)
- severity (enum)
- message
- is_acknowledged
- created_at
```

### Relationships
- One Medicine → Many Batches
- One Batch → Many WarehouseStock entries
- One Warehouse → Many WarehouseStock entries
- One Batch → Many StockMovements
- One User → Many StockMovements
- One Batch → Many TemperatureLogs

---

## 🔒 Security

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication with 1-hour expiration
- **bcrypt**: Password hashing with salt
- **RBAC**: Role-based access control with 4 user levels
- **Rate Limiting**: API endpoint throttling (100 requests/minute)

### Data Protection
- **HTTPS Only**: TLS 1.2+ enforced in production
- **SQL Injection**: Parameterized queries via ORM
- **XSS Protection**: Input sanitization and CSP headers
- **CSRF Protection**: Token-based validation

### Operational Security
- **Audit Logging**: All critical actions logged with user attribution
- **IP Tracking**: Request origin logging for security analysis
- **Soft Deletes**: Data retention for compliance and recovery
- **Encrypted Fields**: Sensitive data encrypted at rest

### Best Practices
```python
# Example: Password validation
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- At least 1 special character
```

---

## ⚡ Performance Targets

### Design Specifications
- **Target Concurrent Users**: 500+ simultaneous users
- **Target Dashboard Load**: < 3 seconds initial load
- **Target WebSocket Latency**: < 2 seconds for real-time alerts
- **Database Design**: Optimized with indexes and query caching strategy
- **Target API Response**: < 200ms for 95th percentile

### Planned Optimization Techniques
- **Redis Caching**: Frequently accessed data caching (1-hour TTL)
- **Database Indexing**: Foreign keys, unique constraints, compound indexes
- **Connection Pooling**: Reusable database connections
- **Lazy Loading**: Frontend components loaded on demand
- **Background Jobs**: Heavy processing offloaded to Celery workers

### Scalability Design
- **Horizontal Scaling**: Stateless API design for load balancing
- **Database Replication**: Read replicas for query distribution (planned)
- **Redis Cluster**: Distributed caching and pub/sub capability
- **Docker Orchestration**: Kubernetes-ready architecture

---

## 🧪 Testing (Planned)

> **Status**: Testing infrastructure will be implemented alongside core modules.

```bash
# Planned test commands
pytest tests/unit

# Integration tests (once modules are integrated)
pytest tests/integration

# Coverage reporting
pytest --cov=pharma_inventory --cov-report=html

# Specific test module
pytest tests/test_inventory.py -v
```

### Planned Test Coverage Goals
- Unit Tests: > 80%
- Integration Tests: > 60%
- Critical Paths: 100%

---

## 📊 Monitoring & Logging (Planned)

> **Status**: Monitoring and logging infrastructure planned for Phase 2 implementation.

### Planned Application Logs
```python
# Planned log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
# Planned location: /var/log/pharma_inventory/
```

### Planned Metrics
- Request rate and latency
- Error rates by endpoint
- Database query performance
- Background job success rate
- WebSocket connection count

### Planned Health Checks
```bash
# Planned health endpoint
curl http://localhost:8000/health

# Expected response structure
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "celery_worker": "active",
  "timestamp": "2024-02-24T10:30:00Z"
}
```

---

## 🤝 Contributing

We welcome contributions at this early stage! Whether you're interested in:
- 🐛 Reporting bugs or issues
- 💡 Suggesting new features
- 📝 Improving documentation
- 💻 Writing code
- 🧪 Adding tests
- 🎨 Designing UI/UX

Your input is valuable!

### How to Contribute

1. **Check Current Status**: Review the [Development Roadmap](#-development-roadmap) to see what's being worked on
2. **Pick an Area**: Look for issues tagged with `good first issue` or `help wanted`
3. **Fork the Repository**
4. **Create a Feature Branch**: `git checkout -b feature/your-feature-name`
5. **Make Your Changes**: Follow our coding standards
6. **Test Your Changes**: Ensure nothing breaks
7. **Commit Changes**: `git commit -m 'Add: brief description of changes'`
8. **Push to Branch**: `git push origin feature/your-feature-name`
9. **Open a Pull Request**: Describe your changes and reference any related issues

### Development Setup for Contributors
```bash
# Install development dependencies (once available)
pip install -r requirements-dev.txt

# Install pre-commit hooks (once configured)
pre-commit install

# Run code formatting
black .

# Run linting
flake8 .

# Run type checking
mypy .
```

### Code Standards (Planned)
- Follow PEP 8 style guide for Python code
- Write descriptive commit messages
- Add unit tests for new features (once testing infrastructure is ready)
- Update documentation for any API changes
- Comment complex logic
- Use type hints where applicable

### Areas Where We Need Help

**High Priority:**
- [ ] Setting up CI/CD pipeline
- [ ] Creating database migration scripts
- [ ] Implementing authentication system
- [ ] Writing unit tests
- [ ] Frontend development (HTML/CSS/JS)

**Documentation:**
- [ ] Improving installation instructions
- [ ] Creating user guides
- [ ] API documentation examples
- [ ] Architecture diagrams

**Design:**
- [ ] UI/UX mockups for dashboard
- [ ] Logo and branding
- [ ] Responsive design patterns

### Communication

- **GitHub Issues**: For bug reports and feature requests
- **Pull Requests**: For code contributions
- **Discussions**: For general questions and ideas
- **Email**: [To be added] for private inquiries

### First-Time Contributors

Never contributed to open source before? No problem! We're happy to help you get started. Look for issues tagged with `good first issue` - these are simpler tasks perfect for learning our codebase.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

**Project Lead**: [Your Name]  
**Status**: Solo developer, open to collaborators  
**Contact**: [GitHub Profile](https://github.com/yourusername)

### Looking for Team Members
This project is actively seeking contributors in:
- Backend development (Python/FastAPI)
- Frontend development (JavaScript/HTML/CSS)
- Database design and optimization
- DevOps and deployment
- Technical documentation
- UI/UX design

Interested in joining? Open an issue or reach out!

---

## 🙏 Acknowledgments

- FastAPI community for excellent documentation
- Redis for robust caching and pub/sub
- Celery for reliable background job processing
- Docker for containerization best practices

---

## 📞 Support & Contact

This project is in early development. Support channels are being established.

**Current Options:**
- **GitHub Issues**: [Report bugs or request features](https://github.com/yourusername/pharma-inventory-system/issues)
- **GitHub Discussions**: [Ask questions or share ideas](https://github.com/yourusername/pharma-inventory-system/discussions)
- **Email**: [Your email] (for private inquiries)

**Planned:**
- Dedicated documentation site
- Community Discord/Slack channel
- FAQ section
- Video tutorials

### Response Time
As this is an early-stage project with limited resources:
- **Issues**: Typically reviewed within 48-72 hours
- **Pull Requests**: Reviewed within 1 week
- **Email**: Within 3-5 business days

Your patience and understanding are appreciated!

---

## 🗺️ Development Roadmap

### Phase 1: Foundation (Current - Month 1-2)
**Goal**: Establish core infrastructure and basic functionality

#### Deliverables
- [x] Complete system design and architecture
- [x] Database schema finalization
- [x] Technology stack selection
- [ ] Development environment setup
- [ ] Database implementation with migrations
- [ ] Authentication & Authorization system
  - User registration and login
  - JWT token management
  - Role-based access control (RBAC)
  - Password encryption with bcrypt
- [ ] Basic user management API
- [ ] API documentation setup (Swagger/OpenAPI)
- [ ] Docker containerization setup
- [ ] Basic error handling and logging

**Success Criteria**: 
- Functional authentication system
- Users can register, login, and receive JWT tokens
- Role-based permissions working
- Docker development environment operational

---

### Phase 2: Core Inventory Management (Month 3-4)
**Goal**: Implement medicine, batch, and warehouse management

#### Deliverables
- [ ] Medicine Management Module
  - CRUD operations for medicines
  - Category and storage type management
  - Minimum stock threshold configuration
- [ ] Batch Tracking System
  - Unique batch number generation
  - Manufacture and expiry date tracking
  - Batch quantity management
  - Temperature range specification
- [ ] Warehouse Management
  - Multiple warehouse support
  - Warehouse location tracking
  - Warehouse-specific configurations
- [ ] Warehouse Stock Module
  - Stock allocation to warehouses
  - Stock balance tracking
  - Transaction-safe operations
- [ ] Stock Movement Ledger
  - Complete audit trail
  - Movement type classification
  - User attribution

**Success Criteria**:
- End-to-end stock allocation workflow functional
- All CRUD operations working with proper validation
- Transaction integrity maintained
- Basic audit logging in place

---

### Phase 3: Advanced Features (Month 5-6)
**Goal**: Implement monitoring, alerts, and compliance features

#### Deliverables
- [ ] Expiry Monitoring System
  - Automated daily batch expiry checks
  - 30-day advance warning system
  - Expiry alert generation
- [ ] Low Stock Alert System
  - Threshold-based monitoring
  - Automated notifications
  - Dashboard alert display
- [ ] Temperature Monitoring
  - Temperature logging functionality
  - Range validation
  - Breach detection and alerts
- [ ] Redis Integration
  - Caching layer implementation
  - Distributed locking for transfers
  - Pub/Sub for real-time notifications
- [ ] Celery Background Jobs
  - Daily expiry check job
  - Scheduled reporting jobs
  - Alert distribution system
- [ ] Basic Frontend Development
  - Dashboard skeleton
  - Login and registration pages
  - Stock management interface

**Success Criteria**:
- Automated alerts functioning
- Background jobs running reliably
- Basic web interface operational
- Redis caching improving performance

---

### Phase 4: Real-time & Compliance (Month 7-8)
**Goal**: Add real-time features and regulatory compliance tools

#### Deliverables
- [ ] WebSocket Implementation
  - Real-time alert push notifications
  - Live dashboard updates
  - Connection management
- [ ] Recall Workflow System
  - Manager recall request submission
  - Admin approval/rejection workflow
  - Automated batch blocking
  - Multi-warehouse notification
- [ ] Comprehensive Audit Logging
  - User action tracking
  - IP address logging
  - Before/after value comparison
  - Login attempt monitoring
- [ ] Inter-warehouse Transfer System
  - Transfer request workflow
  - Distributed lock implementation
  - Transaction-safe transfers
  - Transfer history tracking
- [ ] Reporting Module
  - Expiry reports (CSV/PDF)
  - Stock movement reports
  - Temperature violation reports
  - Recall history reports

**Success Criteria**:
- Real-time updates working across clients
- Recall workflow fully functional
- Comprehensive audit trail available
- Report generation working for all types

---

### Phase 5: Polish & Optimization (Month 9-10)
**Goal**: Optimize performance, enhance UI/UX, and prepare for deployment

#### Deliverables
- [ ] Performance Optimization
  - Database query optimization
  - API response time improvements
  - Frontend loading optimization
  - Caching strategy refinement
- [ ] Frontend Enhancement
  - Responsive design completion
  - User-friendly dashboard
  - Interactive charts and graphs
  - Mobile-friendly interface
- [ ] Security Hardening
  - Rate limiting implementation
  - Input validation enhancement
  - HTTPS/TLS configuration
  - Security audit and penetration testing
- [ ] Comprehensive Testing
  - Unit test suite (>80% coverage)
  - Integration tests
  - End-to-end testing
  - Load testing
- [ ] Documentation
  - API documentation completion
  - User manual creation
  - Deployment guide
  - Maintenance documentation

**Success Criteria**:
- Application meets performance targets
- User interface is intuitive and responsive
- Security best practices implemented
- Test coverage goals achieved
- Documentation complete and clear

---

### Phase 6: Deployment & Future Enhancements (Month 11+)
**Goal**: Deploy to production and plan next iterations

#### Deliverables
- [ ] Production Deployment
  - AWS/Cloud infrastructure setup
  - CI/CD pipeline configuration
  - Production database setup
  - SSL certificate configuration
  - Monitoring and alerting setup
- [ ] User Training & Onboarding
  - Training materials creation
  - Admin training sessions
  - User documentation
- [ ] Post-launch Support
  - Bug fixes and issues resolution
  - Performance monitoring
  - User feedback collection
  - Iterative improvements

#### Future Feature Considerations
- [ ] Mobile application (iOS/Android)
- [ ] AI-powered demand forecasting
- [ ] Integration with government regulatory systems
- [ ] Blockchain-based supply chain tracking
- [ ] Advanced analytics and BI dashboard
- [ ] Multi-language support
- [ ] Barcode/QR code scanning
- [ ] SMS/Email notification system
- [ ] Advanced reporting with custom filters
- [ ] Data export to external systems

**Success Criteria**:
- Application successfully deployed to production
- Users trained and onboarded
- System stable and performant
- Feedback loop established for continuous improvement

---

### Timeline Summary

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Foundation | Month 1-2 | 🟡 In Progress |
| Phase 2: Core Inventory | Month 3-4 | ⚪ Planned |
| Phase 3: Advanced Features | Month 5-6 | ⚪ Planned |
| Phase 4: Real-time & Compliance | Month 7-8 | ⚪ Planned |
| Phase 5: Polish & Optimization | Month 9-10 | ⚪ Planned |
| Phase 6: Deployment | Month 11+ | ⚪ Planned |

**Total Estimated Development Time**: 10-12 months to production-ready system

---

### Contributing to the Roadmap

This roadmap is subject to change based on:
- Technical challenges encountered
- Stakeholder feedback
- Regulatory requirement changes
- Resource availability

Community feedback and contributions are welcome. See the [Contributing](#-contributing) section for details.

---

## 📈 Project Status

**Current Version**: 0.1.0-alpha  
**Development Status**: Phase 1 - Foundation (Planning & Initial Setup)  
**Started**: February 2024  
**Expected Phase 1 Completion**: April 2024  
**Target Production Release**: December 2024

### Contribution Status
- **Open for Contributions**: Yes
- **Issues Tracker**: Active
- **Pull Requests**: Welcome (see contributing guidelines)
- **Discord/Slack**: [Link to be added]

### Transparency Commitment
This project maintains full transparency about its development status. All claims in this README reflect either:
- ✅ **Completed**: Fully implemented and tested
- 🚧 **In Progress**: Currently being developed
- 📋 **Planned**: Designed and scheduled for future implementation

We believe in honest representation of project capabilities and welcome community involvement in bringing this vision to reality.

---

## 🌟 Why This Project?

### Problem Statement
Pharmaceutical inventory management is a critical yet challenging domain. Poor inventory control leads to:
- Expired medication losses (estimated 3-5% of inventory annually)
- Regulatory compliance violations and penalties
- Inability to trace batches during recalls
- Stock inconsistencies across multiple warehouses
- Lack of real-time visibility into operations

### Our Solution
This system aims to solve these problems through:
- **Complete Traceability**: Every unit tracked from receipt to dispatch
- **Proactive Monitoring**: Automated alerts prevent expiry losses
- **Regulatory Compliance**: Built-in audit logging meets pharma regulations
- **Multi-Location Support**: Centralized control with local flexibility
- **Real-Time Operations**: Instant updates and notifications

### Learning & Growth
This project serves multiple purposes:
- 📚 Demonstrating enterprise software architecture skills
- 🏗️ Practicing modern development practices (Docker, CI/CD, testing)
- 🔐 Implementing security best practices (JWT, encryption, RBAC)
- ⚡ Building scalable, performant systems
- 📊 Working with complex business logic and compliance requirements

### For Recruiters & Hiring Managers
This project demonstrates:
- ✅ **Full-Stack Development**: Backend API design, database modeling, frontend planning
- ✅ **System Design**: Scalable architecture with caching, message queues, WebSockets
- ✅ **Domain Knowledge**: Understanding of pharmaceutical industry requirements
- ✅ **Best Practices**: Security, testing, documentation, version control
- ✅ **Project Management**: Phased roadmap, realistic timelines, transparent status tracking
- ✅ **Honesty & Integrity**: Clear communication about what's built vs. planned

While the project is in early development, the planning, architecture, and approach demonstrate production-ready thinking and capabilities.

---

**⭐ If you find this project interesting, please consider starring it! Stars help others discover the project and motivate continued development.**

**🤝 Interested in collaborating? Open an issue or reach out directly. Let's build something great together!**

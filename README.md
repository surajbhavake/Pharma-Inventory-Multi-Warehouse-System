# 🏥 Pharma Inventory & Multi-Warehouse Batch Tracking System

> An industrial-grade pharmaceutical inventory management system focused on batch-level tracking, multi-warehouse operations, and regulatory compliance through workflow-based processes.

[![Status: In Development](https://img.shields.io/badge/Status-In%20Development-yellow.svg)]()
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
│         Frontend (HTML/CSS/JavaScript)               │
│           Bootstrap 5 + Vanilla JS                   │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS/REST API
                     ▼
┌─────────────────────────────────────────────────────┐
│              Django REST Framework                   │
│         JWT Middleware + Permission Classes          │
└────────┬─────────────────────────────────┬──────────┘
         │                                   │
         ▼                                   ▼
┌──────────────────┐              ┌──────────────────┐
│  Authentication  │              │  Business Logic  │
│     Views        │              │     Views        │
│                  │              │                  │
│ - Login/Register │              │ - Medicine CRUD  │
│ - Token Refresh  │              │ - Batch CRUD     │
│ - RBAC Check     │              │ - Stock Allocate │
└──────────────────┘              │ - Stock Transfer │
                                  │ - Movement Log   │
                                  │ - Recall Workflow│
                                  └─────────┬────────┘
                                            │
                                            ▼
                                  ┌────────────────────┐
                                  │    Django ORM      │
                                  │  (Transaction-Safe)│
                                  └─────────┬──────────┘
                                            │
                                            ▼
                                  ┌────────────────────┐
                                  │    MySQL 8.0+      │
                                  │                    │
                                  │ - InnoDB Engine    │
                                  │ - ACID Transactions│
                                  │ - Row-Level Locking│
                                  │ - Foreign Keys     │
                                  │ - Indexes          │
                                  └────────────────────┘

```

### Component Responsibilities

| Component | Technology | Responsibility |
|-----------|-----------|----------------|
| **API Layer** | Django REST Framework | RESTful endpoints, serialization, validation |
| **Auth** | djangorestframework-simplejwt | JWT generation/validation |
| **Business Logic** | Django Views/ViewSets | Core inventory operations, workflow management |
| **ORM** | Django ORM | Database abstraction, query building, transactions |
| **Database** | MySQL 8.0+ (InnoDB) | Persistent storage, ACID transactions, row locking |
| **Frontend** | HTML/CSS/JS + Bootstrap | Dashboard, forms, simple UI |

### Why Django + MySQL?

**Django Benefits**:
- ✅ Batteries included (admin panel, ORM, auth)
- ✅ Django ORM provides transaction management out of the box
- ✅ Automatic admin interface for rapid development
- ✅ Built-in validation and security features
- ✅ Excellent documentation and community

**MySQL Benefits**:
- ✅ InnoDB engine supports ACID transactions
- ✅ Row-level locking for concurrent operations
- ✅ Widely used, well-documented
- ✅ Good performance for this scale
- ✅ Free and open-source

**Simplicity**:
- ❌ No Celery (query-based alerts instead)
- ❌ No WebSockets (polling is sufficient)
- ❌ No Redis (MySQL handles locking, caching not needed yet)
- ❌ No Temperature Monitoring (unnecessary complexity)
- ✅ Pure Django + MySQL = Simpler deployment and debugging

---

## 🛠️ Technology Stack

### Backend
- **Framework**: Django 4.2+
- **API**: Django REST Framework 3.14+
- **Auth**: djangorestframework-simplejwt
- **Database**: MySQL 8.0+
- **Database Engine**: InnoDB (for transaction support)
- **Python**: 3.10+

### Frontend
- **Core**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **CSS Framework**: Bootstrap 5
- **HTTP Client**: Fetch API / Axios
- **No complex framework**: Keeping it simple

### Development Tools
- **Containerization**: Docker & Docker Compose
- **Database Migrations**: Django Migrations
- **API Documentation**: drf-spectacular (OpenAPI/Swagger)
- **Testing**: pytest-django, Django TestCase
- **Code Quality**: Black (formatter), Flake8 (linter), isort

### Deployment (Planned)
- **Platform**: AWS EC2 / DigitalOcean / Railway
- **Web Server**: Nginx (reverse proxy)
- **App Server**: Gunicorn
- **Database**: Managed MySQL or self-hosted
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

#
## 📞 Contact

**Project Lead**: [Suraj Bhavake]  
**GitHub**: [@surajbhavake](https://github.com/surajbhavake)  
**Email**: surajbhavake2@gmail.com  
**LinkedIn**: [Your LinkedIn](https://linkedin.com/in/surajbhavake__)

### Project Links

- **Repository**: https://github.com/surajbhavake/pharma-inventory-system
- **Issues**: https://github.com/surajbhavake/pharma-inventory-system/issues
- **Discussions**: https://github.com/surajbhavake/pharma-inventory-system/discussions
- **Project Board**: https://github.com/surajbhavake/pharma-inventory-system/projects

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


---


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

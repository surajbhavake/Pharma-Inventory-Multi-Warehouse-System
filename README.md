# Pharma Inventory & Multi-Warehouse Batch Tracking System

**Version:** 0.1.0-alpha &nbsp;|&nbsp; **Status:** Phase 1 – Foundation &nbsp;|&nbsp; **Python:** 3.10+ &nbsp;|&nbsp; **Docker:** Enabled

An industrial-grade pharmaceutical inventory management system designed around batch-level tracking, multi-warehouse coordination, and regulatory compliance through workflow-driven processes.

> **Note:** This project is currently in Phase 1. The architecture and features described below represent a carefully scoped, production-thinking system focused on demonstrating industrial software engineering practices.

---

## Table of Contents

1. [Overview](#overview)
2. [Development Status](#development-status)
3. [Core Features](#core-features)
4. [System Architecture](#system-architecture)
5. [Technology Stack](#technology-stack)
6. [Database Schema](#database-schema)
7. [API Reference](#api-reference)
8. [Installation](#installation)
9. [Security](#security)
10. [Testing Strategy](#testing-strategy)
11. [Project Scope & Decisions](#project-scope--decisions)
12. [Contributing](#contributing)
13. [Contact](#contact)

---

## Overview

### The Problem

Pharmaceutical inventory management has requirements that generic inventory systems treat as afterthoughts:

| Concern | Generic System | This System |
|---|---|---|
| Tracking granularity | Product-level | Batch-level |
| Warehouse operations | Single location | Multi-warehouse with transfer consistency |
| Audit requirements | Optional logs | Immutable, append-only ledger |
| Critical operations | Direct execution | Approval-gated workflows |
| Data integrity | Best-effort | ACID-compliant transactions |

### The Solution

A focused backend system built around **six core industrial capabilities**:

1. **JWT Authentication + RBAC** — Stateless auth with role-enforced access control
2. **Batch-Level Inventory** — Every batch uniquely tracked across all warehouse locations
3. **Multi-Warehouse Transfers** — Transaction-safe stock movement with rollback guarantees
4. **Stock Movement Ledger** — Append-only audit trail for full regulatory compliance
5. **Recall Approval Workflow** — Manager request → Admin review → Batch blocking
6. **Query-Based Alerts** — On-demand expiry and low-stock detection without background job complexity

---

## Development Status

**Phase:** Foundation & Core Implementation &nbsp;|&nbsp; **Started:** February 2024 &nbsp;|&nbsp; **Target Completion:** September 2024

### Completed
- System design and architecture
- Business Requirements Specification (BRS)
- Software Requirements Specification (SRS)
- Functional Requirements Specification (FRS)
- Normalized, transaction-safe database schema design
- API endpoint planning and documentation
- Technology stack finalization

### In Progress
- Docker development environment setup
- Database implementation with migrations
- JWT authentication system
- Role-Based Access Control (RBAC)
- User management APIs

### Planned
- Medicine and batch management module
- Multi-warehouse inventory tracking
- Stock transfer with transaction safety
- Stock movement ledger
- Recall approval workflow

---

## Core Features

### 1. Authentication & Authorization
**Status: In Progress**

- JWT-based authentication with configurable token expiration
- Role-Based Access Control with four distinct roles: Admin, Warehouse Manager, Staff, Auditor
- bcrypt password hashing (12 salt rounds)
- Token refresh mechanism for session management

Each role has explicitly scoped permissions. No role escalation without an admin action. Every protected endpoint validates both token validity and role authorization before execution.

---

### 2. Medicine & Batch Management
**Status: Planned**

**Medicine Catalog**
- Unique medicine records with manufacturer details
- Storage classification (refrigerated, controlled temperature, room temperature)
- Minimum stock threshold per medicine for alert triggering
- Category and formulary management

**Batch Tracking**

Each medicine batch is a first-class entity, not a product attribute. This is the architectural decision that makes recall workflows and expiry tracking tractable.

- Unique batch numbers scoped per medicine
- Manufacture and expiry date fields
- Batch-level total quantity
- Variance tracking across batches of the same medicine

---

### 3. Multi-Warehouse Inventory
**Status: Planned**

Stock is tracked at the intersection of **batch × warehouse**, not merely product × warehouse. This enables precise recall scoping and inter-warehouse transfer accuracy.

**Business Constraints (enforced at database level)**

```
Total Batch Quantity ≥ Σ(All Warehouse Allocations for that Batch)
Warehouse Stock ≥ 0
```

Rather than "Product X: 100 units across the network," the system records "Batch B-2024-0047 of Product X: 60 units at Warehouse Mumbai-Central, 40 units at Warehouse Pune-North."

---

### 4. Stock Transfer System
**Status: Planned — Primary Complexity Feature**

Stock transfers are the most technically demanding operation in the system. A naive implementation risks race conditions, partial transfers, and ledger inconsistency. This system handles all three.

**Transfer Execution Model**

```python
BEGIN TRANSACTION
  1. Acquire row-level lock on source warehouse stock
  2. Validate: source_quantity >= requested_transfer_quantity
  3. Deduct quantity from source warehouse record
  4. Credit quantity to destination warehouse record
  5. Write paired ledger entries (TRANSFER_OUT + TRANSFER_IN)
COMMIT
-- On any failure: automatic ROLLBACK, no partial state persists
```

**Key Properties**
- Full ACID compliance via InnoDB transactions
- Row-level locking prevents concurrent modification of the same stock record
- Atomic ledger entry creation — transfer records and stock changes are inseparable
- No partial transfers possible; the database enforces this, not application logic alone

---

### 5. Stock Movement Ledger
**Status: Planned**

Every stock change — allocation, dispatch, transfer, adjustment — produces an immutable ledger entry. The ledger is append-only by design; no updates or deletions are permitted at any role level.

| Field | Type | Purpose |
|---|---|---|
| `batch_id` | FK | Identifies which batch was affected |
| `warehouse_id` | FK | Location of the movement |
| `movement_type` | Enum | `ALLOCATION`, `DISPATCH`, `TRANSFER_OUT`, `TRANSFER_IN` |
| `quantity` | Integer | Signed delta (positive = credit, negative = debit) |
| `performed_by` | FK | User who initiated the action |
| `created_at` | Timestamp | Immutable creation time |
| `reference_id` | UUID | Links paired movements (e.g., both sides of a transfer) |

The complete stock history for any batch at any warehouse can be reconstructed entirely from the ledger. Current stock figures are a derived view of ledger history, not the authoritative record.

---

### 6. Recall Approval Workflow
**Status: Planned — Non-CRUD Business Logic**

Recalls are a regulated process, not a database toggle. This system models them as a state machine with mandatory approval gates.

**State Transitions**

```
[Manager Action]  →  PENDING
[Admin Approves]  →  APPROVED  →  Batch flagged is_recalled=TRUE, dispatch blocked
[Admin Rejects]   →  REJECTED  →  No batch changes, rejection reason recorded
```

**On Approval**
- Batch record updated: `is_recalled = TRUE`
- All future dispatch attempts against this batch are blocked at the API layer
- Ledger entry written recording the recall event and approving admin
- Approval timestamp and admin identity permanently recorded

**On Rejection**
- Recall request marked `REJECTED` with mandatory reason field
- Batch record remains unchanged
- Request history preserved for audit purposes

---

### 7. Alert System
**Status: Planned**

Alerts are calculated on-demand via optimized SQL queries. No Celery workers, no WebSocket connections, no distributed state.

**Expiry Alert Query**

```sql
SELECT *
FROM batches
WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  AND is_recalled = FALSE
ORDER BY expiry_date ASC;
```

**Low Stock Alert Query**

```sql
SELECT m.id, m.name, SUM(ws.quantity) AS total_stock, m.min_threshold
FROM warehouse_stock ws
JOIN medicines m ON ws.medicine_id = m.id
GROUP BY m.id, m.name, m.min_threshold
HAVING SUM(ws.quantity) < m.min_threshold;
```

This approach is deliberately simple. For the scale and use case of this system, polling on page load is reliable, debuggable, and operationally straightforward. Over-engineering alerts with a message broker would add infrastructure complexity with no meaningful user benefit.

---

## System Architecture

```
┌──────────────────────────────────────────────────┐
│           Frontend (HTML/CSS/JavaScript)          │
│              Bootstrap 5 + Vanilla JS             │
└───────────────────────┬──────────────────────────┘
                        │ HTTPS / REST
                        ▼
┌──────────────────────────────────────────────────┐
│             Django REST Framework                 │
│        JWT Middleware + Permission Classes        │
└──────────┬────────────────────────────┬──────────┘
           │                            │
           ▼                            ▼
┌──────────────────┐         ┌──────────────────────┐
│  Authentication  │         │    Business Logic     │
│                  │         │                       │
│  Login/Register  │         │  Medicine & Batch     │
│  Token Refresh   │         │  Stock Allocation     │
│  RBAC Checks     │         │  Stock Transfer       │
└──────────────────┘         │  Movement Ledger      │
                             │  Recall Workflow      │
                             └──────────┬────────────┘
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │      Django ORM       │
                             │  (Transaction-Safe)   │
                             └──────────┬────────────┘
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │      MySQL 8.0+       │
                             │                       │
                             │  InnoDB Engine        │
                             │  ACID Transactions    │
                             │  Row-Level Locking    │
                             │  Foreign Key Checks   │
                             └──────────────────────┘
```

### Component Responsibilities

| Layer | Technology | Responsibility |
|---|---|---|
| API | Django REST Framework | RESTful endpoints, serialization, request validation |
| Auth | djangorestframework-simplejwt | JWT generation, validation, refresh |
| Business Logic | Django Views / ViewSets | Inventory operations, workflow management |
| ORM | Django ORM | Query building, transaction management, schema migrations |
| Database | MySQL 8.0+ (InnoDB) | Persistent storage, ACID guarantees, row-level locking |
| Frontend | HTML/CSS/JS + Bootstrap 5 | Dashboard UI, forms, API consumption |

---

## Technology Stack

### Backend
- **Language:** Python 3.10+
- **Framework:** Django 4.2+
- **API:** Django REST Framework 3.14+
- **Authentication:** djangorestframework-simplejwt
- **Database:** MySQL 8.0+ with InnoDB engine

### Frontend
- HTML5, CSS3, Vanilla JavaScript (ES6+)
- Bootstrap 5
- Fetch API for HTTP requests

### Development & Tooling
- **Containerization:** Docker & Docker Compose
- **Migrations:** Django Migrations
- **API Docs:** drf-spectacular (OpenAPI / Swagger)
- **Testing:** pytest-django, Django TestCase
- **Formatting:** Black
- **Linting:** Flake8, isort

### Planned Deployment
- **Platform:** AWS EC2 / DigitalOcean / Railway
- **Reverse Proxy:** Nginx
- **Application Server:** Gunicorn
- **TLS:** Let's Encrypt

---

## Project Structure

```
pharma-inventory-system/
│
├── frontend/
│   ├── css/
│   ├── js/
│   ├── dashboard.html
│   ├── login.html
│   ├── medicines.html
│   ├── batches.html
│   ├── warehouses.html
│   ├── stock-allocation.html
│   ├── stock-transfer.html
│   ├── recalls.html
│   └── audit-logs.html
│
├── inventory/
│   ├── migrations/
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   ├── filters.py
│   ├── admin.py
│   └── apps.py
│
├── users/
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
│
├── recalls/
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
│
├── pharma_core/
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
│
├── manage.py
├── requirements.txt
├── README.md
└── .gitignore
```

---

## Installation

### Prerequisites
- Python 3.10+
- Docker
- pip

### Steps

**1. Clone the repository**

```bash
git clone https://github.com/surajbhavake/pharma-inventory-system.git
cd pharma-inventory-system
```

**2. Create and activate a virtual environment**

```bash
python3 -m venv venv

# Linux / macOS
source venv/bin/activate

# Windows
venv\Scripts\activate
```

**3. Install dependencies**

```bash
pip install -r requirements.txt
```

**4. Start the MySQL container**

```bash
docker run -d \
  --name pharma-mysql \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -e MYSQL_DATABASE=pharma_db \
  -e MYSQL_USER=pharma_user \
  -e MYSQL_PASSWORD=StrongPassword123! \
  -p 3307:3306 \
  mysql:8
```

Verify the container is running:

```bash
docker ps
# Expected: pharma-mysql  Up X seconds
```

**5. Configure the database**

In `pharma_core/settings.py`:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'pharma_db',
        'USER': 'pharma_user',
        'PASSWORD': 'StrongPassword123!',
        'HOST': '127.0.0.1',
        'PORT': '3307',
    }
}
```

**6. Apply migrations**

```bash
python manage.py makemigrations
python manage.py migrate
```

**7. Create a superuser**

```bash
python manage.py createsuperuser
```

**8. Start the development servers**

```bash
# Backend — http://127.0.0.1:8000
python manage.py runserver

# Frontend — http://127.0.0.1:5500/frontend/login.html
python3 -m http.server 5500
```

**API Documentation (Swagger UI)**

```
http://127.0.0.1:8000/api/docs/
```

---

## API Reference

### Authentication

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/auth/login/` | POST | Obtain JWT access and refresh tokens |
| `/api/v1/auth/register/` | POST | Register a new user |
| `/api/v1/auth/profile/` | GET | Retrieve authenticated user profile |
| `/api/v1/auth/logout/` | POST | Invalidate refresh token |

### Medicines

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/medicines/` | GET, POST | List all medicines / create new |
| `/api/v1/medicines/{id}/` | GET, PUT, PATCH, DELETE | Retrieve / update / delete |

### Batches

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/batches/` | GET, POST | List batches / register new batch |
| `/api/v1/batches/{id}/` | GET, PUT, PATCH, DELETE | Retrieve / update / delete |

### Warehouses

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/warehouses/` | GET, POST | List warehouses / create new |
| `/api/v1/warehouses/{id}/` | GET, PUT, PATCH, DELETE | Retrieve / update / delete |

### Stock Management

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/stock-allocation/` | POST | Allocate batch stock to a warehouse |
| `/api/v1/stock/transfer/` | POST | Transfer stock between warehouses (transactional) |
| `/api/v1/warehouse-stock/` | GET | Query current stock levels |
| `/api/v1/movements/` | GET | Retrieve stock movement ledger |

### Recall Management

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/recalls/` | GET, POST | List recall requests / submit new request |
| `/api/v1/recalls/{id}/` | GET | Retrieve recall details |
| `/api/v1/recalls/{id}/approve/` | POST | Approve a pending recall (Admin only) |
| `/api/v1/recalls/{id}/reject/` | POST | Reject a pending recall (Admin only) |

### Audit

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/audit-logs/` | GET | Query immutable audit log entries |

---

## Security

### Authentication & Session Management
- JWT tokens with 1-hour access token expiration
- Refresh token rotation for secure session extension
- bcrypt password hashing with 12 salt rounds
- All production traffic over HTTPS (enforced via Nginx)

### Authorization
- Four RBAC roles: Admin, Warehouse Manager, Staff, Auditor
- Role checked on every protected endpoint via decorator/permission class
- No implicit permissions; all access is explicitly granted per role

### Data Integrity
- ACID-compliant transactions via InnoDB; no partial writes
- Row-level locking prevents concurrent modification of the same stock record
- Parameterized queries via Django ORM; SQL injection not possible

### Audit & Compliance
- Immutable stock movement ledger; no UPDATE or DELETE operations permitted
- Every action records the performing user, timestamp, and reference ID
- Full transaction history reconstructible from ledger alone

### Planned Additions
- Rate limiting: 100 requests/minute per authenticated user
- Security headers: CSP, HSTS, X-Frame-Options
- IP whitelisting for Admin-role endpoints
- Penetration testing prior to any production deployment

---

## Testing Strategy

```
              /\
             /  \
            / E2E \          ~10% — Full workflow coverage
           /--------\
          /          \
         / Integration \     ~30% — API + database layer tests
        /--------------\
       /                \
      /    Unit Tests    \   ~60% — Business logic and validation
     /--------------------\
```

**Target:** 80%+ overall coverage

**Unit Tests** cover JWT generation and validation, business rule enforcement (quantity checks, role guards), Pydantic/serializer validation, and utility functions.

**Integration Tests** cover API endpoint response contracts, database CRUD operations, transaction rollback scenarios under simulated failures, and RBAC enforcement across all protected routes.

**End-to-End Tests** cover three critical paths at 100%: the full stock transfer flow including ledger verification; the recall submission-to-approval flow including dispatch blocking; and the stock dispatch failure path when quantity is insufficient.

**Example: Stock Transfer Test**

```python
@pytest.mark.asyncio
async def test_transfer_maintains_total_quantity():
    """Stock transfer must be atomic: total units in system unchanged."""
    batch = await create_test_batch(quantity=100)
    warehouse_a, warehouse_b = await create_warehouses("A", "B")
    await allocate_stock(batch.id, warehouse_a.id, quantity=100)

    response = await client.post(
        "/api/v1/stock/transfer/",
        json={
            "batch_id": str(batch.id),
            "source_warehouse_id": str(warehouse_a.id),
            "destination_warehouse_id": str(warehouse_b.id),
            "quantity": 50,
        },
        headers={"Authorization": f"Bearer {manager_token}"},
    )

    assert response.status_code == 200
    assert (await get_warehouse_stock(warehouse_a.id, batch.id)).quantity == 50
    assert (await get_warehouse_stock(warehouse_b.id, batch.id)).quantity == 50

    movements = await get_movements(batch.id)
    assert len(movements) == 2
    assert {m.movement_type for m in movements} == {"TRANSFER_OUT", "TRANSFER_IN"}
```

---

## Project Scope & Decisions

The following features were evaluated and deliberately excluded to maintain implementation depth over feature breadth.

| Feature | Decision | Rationale |
|---|---|---|
| Real-time temperature monitoring | Excluded | Sensor integration adds infrastructure complexity with no benefit to core workflows |
| WebSocket alerts | Excluded | Query-on-load polling is reliable and sufficient at this scale |
| Celery background workers | Excluded | Adds a Redis/broker dependency; SQL queries handle the same job |
| Mobile applications | Excluded | Web-first; responsive Bootstrap UI covers mobile browsers |
| AI demand forecasting | Excluded | Out of scope; requires separate data pipeline and model serving |
| Blockchain provenance tracking | Excluded | Not practical for a focused backend portfolio project |

The guiding principle: prefer deep, correct implementation of a smaller feature set over shallow coverage of a large one.

---

## Contributing

Contributions are welcome across all aspects of the project:

- Bug reports and reproducible test cases
- Feature proposals aligned with the project's scope
- Documentation improvements
- Code contributions with test coverage
- UI/UX feedback on the frontend

Please open an issue before submitting a pull request for significant changes.

**Response times** (solo developer with academic commitments):
- Issues: 2–3 days
- Pull requests: within 1 week
- Email: 3–5 business days

---

## Contact

**Suraj Bhavake**
GitHub: [@surajbhavake](https://github.com/surajbhavake)
Email: surajbhavake2@gmail.com
LinkedIn: [linkedin.com/in/surajbhavake__](https://linkedin.com/in/surajbhavake__)

**Repository:** https://github.com/surajbhavake/pharma-inventory-system

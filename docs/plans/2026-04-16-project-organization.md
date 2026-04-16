# Project Structure Organization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Analyze and organize files in the workspace to improve project structure and prepare for deployment while preserving essential files and creating comprehensive documentation.

**Architecture:** This plan follows a systematic approach: (1) Analyze current structure, (2) Identify files to keep/remove, (3) Clean up unnecessary files, (4) Reorganize directory structure, (5) Create comprehensive documentation.

**Tech Stack:** Node.js (Koa framework), Vue 3 (Admin frontend), SQLite/JSON database, Tencent Cloud Functions

---

## Current Project Analysis

### Project Overview
This is a middleware service that integrates Youzan (有赞) e-commerce platform with a third-party one-product-one-code (一物一码) system. It handles:
- Inventory synchronization
- Order fulfillment
- Return/refund processing
- Anti-counterfeit code tracking

### Current Directory Structure
```
dirun_oioc/
├── admin/                    # Vue 3 admin frontend
├── API文档/oioc/             # API documentation (Chinese)
├── database/                 # SQLite database files
├── docs/                     # Project documentation
├── public/                   # Static files served by Koa
├── src/                      # Core backend source code
│   ├── clients/              # API clients (Youzan, OIOC)
│   ├── config/               # Configuration
│   ├── controllers/          # Request handlers
│   ├── middleware/           # Auth middleware
│   ├── models/               # Data models
│   ├── routes/               # API routes
│   └── services/             # Business logic
├── tests/                    # Test files
│   ├── api/                  # API tests
│   └── flow/                 # Flow tests
├── index.js                  # Main entry point
├── serverless.yml            # Tencent Cloud config
├── template.yaml             # Aliyun Cloud config
└── deploy-*.sh               # Deployment scripts
```

---

## Task 1: File Analysis and Classification

**Files:**
- Read: All project files for analysis

**Step 1: Identify files to KEEP (Essential)**

Core Business Logic:
- `index.js` - Main server entry
- `src/` - All source code (clients, config, controllers, middleware, models, routes, services)
- `admin/` - Admin frontend source

Configuration Files:
- `package.json` - Dependencies
- `.env.example` - Environment template
- `.gitignore` - Git ignore rules
- `serverless.yml` - Tencent Cloud deployment
- `template.yaml` - Aliyun Cloud deployment

Deployment Scripts:
- `deploy-all.sh` - Full deployment
- `deploy-local.sh` - Local deployment
- `deploy-server.sh` - Server deployment
- `update-server.sh` - Server update

Test Files (Local Testing):
- `tests/test-full-flow.js` - Full workflow test
- `tests/flow/` - Flow tests
- `tests/api/` - API tests
- `tests/mock-data.js` - Mock data

Documentation:
- `docs/README.md` - Main documentation
- `API文档/oioc/` - API reference

Database:
- `database/db.json` - JSON database

Public Files:
- `public/index.html` - Static entry

**Step 2: Identify files to REVIEW (Potentially Redundant)**

Documentation (May have duplicates):
- `docs/APIFOX_GUIDE.md` - Apifox guide
- `docs/API_GUIDE.md` - API guide
- `docs/FIX_SUMMARY.md` - Fix summary (may be outdated)
- `docs/JAVASCRIPT_SYNTAX_GUIDE.md` - JS syntax guide
- `docs/OIOC_API_IMPLEMENTATION.md` - OIOC implementation
- `docs/SYNC_SERVICE_IMPLEMENTATION.md` - Sync service docs
- `docs/YOUZAN_API_IMPLEMENTATION.md` - Youzan implementation
- `docs/products.md` - Products info
- `docs/youzan-auth.md` - Youzan auth
- `docs/业务场景说明.md` - Business scenarios

Test Files (May have duplicates):
- `tests/api/test.js` - Generic test file
- `tests/api/youzan-api.js` - Youzan API test
- `tests/api/apifox_导出api.js` - Apifox export

Other Files:
- `有赞_一物一码_货物出入库流程.md` - Business flow doc
- `run-tests.bat` - Windows test runner
- `start-local-test.bat` - Local test starter
- `src/cloud-function.js` - Cloud function entry
- `src/models/database.js` - SQLite model (check if used)

**Step 3: Identify files to REMOVE (Unnecessary)**

- `.env.development` - Local environment (should not be in repo)
- `*.log` files - Log files (should be in .gitignore)
- `output.log` - Output log
- `node_modules/` - Dependencies (should not be in repo)
- Any backup files (*.bak, *.backup)
- Any temporary files (*.tmp, *.temp)

---

## Task 2: Clean Up Unnecessary Files

**Files:**
- Check: `.env.development` existence
- Check: Log files existence
- Check: Backup/temp files

**Step 1: Remove environment-specific files**

Check if `.env.development` exists and should be removed:
```bash
# .env.development should not be committed if it contains secrets
# Check if it's in .gitignore
```

**Step 2: Remove log files**

Files to remove:
- `output.log`
- `*.log` files

**Step 3: Check for duplicate/unused test files**

Review test files for duplicates:
- `tests/api/test.js` vs `tests/api/test-oioc-api.js`
- `tests/api/youzan-api.js` vs `tests/api/test-youzan-api.js`

---

## Task 3: Reorganize Directory Structure

**Files:**
- Create: `logs/` directory
- Create: `scripts/` directory
- Move: Deployment scripts to `scripts/`

**Step 1: Create standardized directories**

Create the following directories:
```
logs/           # For log output
scripts/        # For deployment and utility scripts
```

**Step 2: Move deployment scripts**

Move files to `scripts/`:
- `deploy-all.sh` → `scripts/deploy-all.sh`
- `deploy-local.sh` → `scripts/deploy-local.sh`
- `deploy-server.sh` → `scripts/deploy-server.sh`
- `update-server.sh` → `scripts/update-server.sh`
- `run-tests.bat` → `scripts/run-tests.bat`
- `start-local-test.bat` → `scripts/start-local-test.bat`

**Step 3: Update references in scripts**

Update any hardcoded paths in moved scripts.

---

## Task 4: Consolidate Documentation

**Files:**
- Create: `docs/PROJECT_STRUCTURE.md`
- Update: `docs/README.md`

**Step 1: Create comprehensive project structure documentation**

Create `docs/PROJECT_STRUCTURE.md` with:
- Complete directory structure
- Purpose of each directory
- Key files and their roles
- Architecture overview

**Step 2: Update main README**

Update `docs/README.md` to reference the new structure documentation.

**Step 3: Organize API documentation**

Keep `API文档/oioc/` as the authoritative API reference.

---

## Task 5: Create Comprehensive Documentation

**Files:**
- Create: `docs/PROJECT_STRUCTURE.md`
- Create: `docs/DEPLOYMENT_GUIDE.md`
- Create: `docs/TESTING_GUIDE.md`

**Step 1: Write PROJECT_STRUCTURE.md**

Content includes:
1. Project Overview
2. Directory Structure
3. Core Components
4. Data Flow
5. Configuration

**Step 2: Write DEPLOYMENT_GUIDE.md**

Content includes:
1. Prerequisites
2. Local Development Setup
3. Server Deployment
4. Cloud Function Deployment
5. Environment Variables
6. Post-deployment Verification

**Step 3: Write TESTING_GUIDE.md**

Content includes:
1. Test Environment Setup
2. Running Tests
3. Test Categories
4. Mock Data
5. Troubleshooting

---

## Task 6: Update .gitignore

**Files:**
- Modify: `.gitignore`

**Step 1: Add missing entries**

Add to `.gitignore`:
```
# Environment files
.env
.env.local
.env.development
.env.production

# Logs
logs/
*.log
output.log

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Dependencies
node_modules/

# Build outputs
admin/dist/

# Database (optional, depending on strategy)
# database/*.db
# database/*.json

# Temporary files
*.tmp
*.temp
*.bak
*.backup
```

---

## Task 7: Verify Project Structure

**Files:**
- Check: All files are in correct locations
- Run: Tests to ensure nothing is broken

**Step 1: Verify file structure**

Ensure all essential files are present and accessible.

**Step 2: Run tests**

```bash
npm test
```

**Step 3: Verify deployment scripts**

Ensure deployment scripts still work after reorganization.

---

## Final Directory Structure (Target)

```
dirun_oioc/
├── admin/                      # Vue 3 admin frontend
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── API文档/                    # API documentation
│   └── oioc/
├── database/                   # Database files
│   └── db.json
├── docs/                       # Documentation
│   ├── plans/                  # Implementation plans
│   ├── README.md               # Main documentation
│   ├── PROJECT_STRUCTURE.md    # Structure guide
│   ├── DEPLOYMENT_GUIDE.md     # Deployment guide
│   ├── TESTING_GUIDE.md        # Testing guide
│   └── ... (other docs)
├── logs/                       # Log output directory
├── public/                     # Static files
│   └── index.html
├── scripts/                    # Deployment/utility scripts
│   ├── deploy-all.sh
│   ├── deploy-local.sh
│   ├── deploy-server.sh
│   ├── update-server.sh
│   ├── run-tests.bat
│   └── start-local-test.bat
├── src/                        # Backend source code
│   ├── clients/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── cloud-function.js
├── tests/                      # Test files
│   ├── api/
│   ├── flow/
│   ├── mock-data.js
│   └── test-full-flow.js
├── .env.example                # Environment template
├── .gitignore                  # Git ignore rules
├── index.js                    # Main entry point
├── package.json                # Dependencies
├── serverless.yml              # Tencent Cloud config
└── template.yaml               # Aliyun Cloud config
```

---

## Execution Notes

1. **Backup before changes**: Ensure git is clean before making changes
2. **Incremental changes**: Make one change at a time and verify
3. **Test after each task**: Run tests to ensure nothing is broken
4. **Update imports**: If moving files, update any import paths
5. **Commit frequently**: Commit after each major change

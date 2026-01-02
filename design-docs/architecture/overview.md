# Claude Code Peeper - Project Overview

## Purpose

Claude Code Peeper is a tool for reading, searching, and interacting with Claude Code data.

## Core Objectives

### 1. Log and Data Reader
- Read Claude Code logs (session transcripts, history)
- Read configuration files (`~/.claude.json`, settings)
- Read project-specific data (sessions, todos, file history)
- Parse and normalize data into structured formats

### 2. Searchable UI
- Provide web-based UI (SvelteKit) for browsing and searching
- Full-text search across sessions and history
- Filter by project, date, session type
- Timeline and conversation views

### 3. Library for External Integration
- Export as a TypeScript/JavaScript library
- Provide structured data that can be:
  - Stored in Vector DB (for semantic search)
  - Stored in Full-text search DB (Elasticsearch, Meilisearch, etc.)
  - Used by other applications
- Clean API for data access

### 4. Claude Code Interaction
- POST messages to Claude Code sessions
- Programmatic interaction with Claude Code
- Automation capabilities

### 5. Auth Token Management
- Manage Claude Code authentication tokens
- Token refresh and validation
- Secure token storage

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code Peeper                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │   CLI App    │   │   Web UI     │   │   Library    │    │
│  │   (Bun)      │   │  (SvelteKit) │   │   (NPM)      │    │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘    │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                 │
│  ┌─────────────────────────┴─────────────────────────────┐  │
│  │                    Core Library                        │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │  │
│  │  │ Reader  │  │ Parser  │  │  Auth   │  │  API    │  │  │
│  │  │         │  │         │  │ Manager │  │ Client  │  │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   External Systems                           │
├──────────────┬──────────────┬───────────────────────────────┤
│  Vector DB   │  Full-text   │      Claude Code              │
│  (Pinecone,  │  Search DB   │      (via API)                │
│   Qdrant)    │  (ES, Meili) │                               │
└──────────────┴──────────────┴───────────────────────────────┘
```

## Modules

### Core Modules

1. **Reader** - File system access to Claude Code data
   - Config reader (`~/.claude.json`)
   - Settings reader (`settings.json`)
   - Session reader (JSONL files)
   - History reader (`history.jsonl`)
   - Todo reader
   - Plugin reader

2. **Parser** - Data parsing and normalization
   - JSON/JSONL parsing
   - Zod schema validation
   - Data normalization
   - Streaming support for large files

3. **Auth Manager** - Authentication handling
   - Token reading from `.credentials.json`
   - Token validation
   - Token refresh
   - Secure storage

4. **API Client** - Claude Code API interaction
   - Session creation
   - Message posting
   - Response handling

### Application Modules

5. **CLI** - Command-line interface
   - Subcommands for various operations
   - Interactive mode
   - Piping support

6. **Web UI** - SvelteKit application
   - Project browser
   - Session viewer
   - Search interface
   - Auth management UI

7. **Library Export** - NPM package
   - TypeScript types
   - Clean API surface
   - Documentation

## Use Cases

### Use Case 1: Browse Session History
User wants to find a specific conversation from a week ago.
- Open web UI
- Filter by date range
- Search for keywords
- View full session transcript

### Use Case 2: Export to Vector DB
Developer wants to build semantic search over Claude Code history.
- Import library
- Read all sessions
- Extract text content
- Push to Vector DB with embeddings

### Use Case 3: Automated Claude Code Interaction
Script needs to send prompts to Claude Code.
- Use API client module
- Authenticate with stored token
- POST message to session
- Receive response

### Use Case 4: Token Management
User needs to manage multiple Claude Code accounts.
- View current tokens
- Add new tokens
- Switch between accounts
- Validate token status

# GEMINI.md - StreamTube Project Context

## Project Overview
StreamTube is a video sharing platform built with a modern stack. This repository is a monorepo containing the backend service, with plans for a Next.js frontend.

- **Main Technologies:**
    - **Backend:** NestJS (Node.js framework)
    - **Database:** PostgreSQL with Prisma ORM
    - **Architecture:** Modular architecture in NestJS, Monorepo structure.
    - **Authentication:** JWT-based with email confirmation.
    - **Services:** Mailer for transactional emails (confirmation, password reset), Docker for development environment.

## Directory Structure
- `docs/`: Project documentation, including the roadmap (`project-plan.md`) and architecture diagrams.
- `nestjs-project/`: The backend application.
    - `src/modules/`: Domain-specific modules (auth, users, prisma, mail, channels).
    - `prisma/`: Database schema and migrations.
    - `test/`: End-to-end tests.

## Development Workflow

### Prerequisites
- Node.js & npm
- Docker & Docker Compose (for database and local development)

### Building and Running
All commands should be run from within the `nestjs-project/` directory:

- **Setup Environment:**
  ```bash
  npm install
  # Start the database and API via Docker
  docker compose up -d
  ```
- **Database Operations (Prisma):**
  ```bash
  npx prisma migrate dev    # Apply migrations
  npx prisma generate       # Generate Prisma Client
  npx prisma studio         # Open DB management UI
  ```
- **Running the App:**
  ```bash
  npm run start:dev        # Development mode with watch
  npm run start            # Simple start
  npm run start:prod       # Production mode
  ```

### Testing and Validation
- **Unit Tests:** `npm run test`
- **E2E Tests:** `npm run test:e2e`
- **Linting:** `npm run lint`
- **Formatting:** `npm run format`

## Development Conventions
- **Modular Design:** Group logic into feature modules (e.g., `auth`, `users`).
- **Data Integrity:** Use DTOs with `class-validator` for all incoming requests.
- **ORM:** Use Prisma Client via the `PrismaService` for all database interactions.
- **Security:**
    - Never hardcode secrets. Use `@nestjs/config` for environment variables.
    - Passwords must be hashed using `bcrypt`.
    - Protect routes using `JwtAuthGuard`.
- **Email:** Use the `MailService` for all transactional emails, utilizing Handlebars templates in `src/modules/mail/templates/`.
- **Coding Style:** Adhere to ESLint and Prettier configurations. Standard NestJS/TypeScript conventions apply.

## Current Roadmap Status
The project is currently in **Phase 02 — Cadastro, Login e Gerenciamento de Conta**.
Key features implemented/in progress:
- User signup/login with JWT.
- Email confirmation flow.
- Automatic channel creation on user registration.
- Password recovery flow.

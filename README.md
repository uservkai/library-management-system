# Library Management System

A NestJS + Prisma + PostgreSQL (Neon) backend for a library book catalog.

## Tech Stack

- NestJS (TypeScript, ES modules)
- Prisma 6 ORM
- PostgreSQL hosted on Neon

## Getting Started

```bash
cd api
npm install
```

1. Create a `.env` file in `api/` (see `api/.env.example`) and set `DATABASE_URL` to your Neon connection string. Use the **direct** connection (not the `-pooler` host) so migrations work reliably.
2. Apply the migrations and generate the Prisma client:

   ```bash
   npx prisma migrate dev
   ```

3. Seed the database:

   ```bash
   npx prisma db seed
   ```

4. Start the app:

   ```bash
   npm run start:dev
   ```

Prisma settings (schema path, migrations path, seed command, `DATABASE_URL`) live in `api/prisma.config.ts`. The seed script is `api/prisma/seed.ts`, run with `tsx`.

To browse the data: `npx prisma studio`.

## Data Model

| Model  | Purpose | Key fields |
|--------|---------|------------|
| User   | A person using the library | `email` (unique), `name`, `role` (`PATRON` or `LIBRARIAN`) |
| Genre  | A category of books | `name` (unique) |
| Book   | A catalog entry | `title`, `author`, `isbn` (unique), `copies`, `genreId` (FK to Genre) |
| Review | *(stretch)* A user's rating of a book | `rating`, `comment`, `bookId`, `userId` |

The seed script inserts 4 genres (Science Fiction, Fantasy, Mystery, Non-Fiction), 16 books (4 per genre), 2 users, and 1 review. It uses `upsert`, so it is safe to run more than once.

## Schema Decisions

**Why Book references Genre instead of embedding it.**
Genre is its own table, and each Book stores a `genreId` foreign key with a Prisma `@relation`, rather than copying the genre name into every book row.

- **Single source of truth:** renaming a genre ("Sci-Fi" to "Science Fiction") is one row update, not an update across every book.
- **No inconsistency:** free-text genres drift ("Mystery", "mystery ", "Mysteries"). A foreign key guarantees every book points to a genre that exists.
- **Efficient queries:** "all books in a genre" or "book count per genre" are indexed joins on `genreId` instead of scans over duplicated strings.
- **Genres are independent entities:** they can exist before any book does, and can later hold their own data (description, slug) without changing Book.
- **Database-enforced integrity:** the database rejects a Book with an invalid `genreId`, no matter which code path writes it.

Other decisions:

- `Role` is an enum (`PATRON`, `LIBRARIAN`), so invalid roles are impossible at the database level. It defaults to `PATRON` (least privilege).
- `Book.isbn` and `User.email` are `@unique` natural identifiers.
- `Review` has `@@unique([bookId, userId])`, so a user can review a book only once, and it cascades on delete so removing a book or user cleans up their reviews.
- `PrismaService` extends `PrismaClient` and connects in `onModuleInit()`; `PrismaModule` is global so any module can inject it.

## Prisma vs. a Document Database

In a document database like MongoDB, I would probably have embedded the genre inside each book document and moved on. In Prisma, I had to declare the relation on both sides (`Book.genre` and `Genre.books`), define the foreign key, and then run a migration before I could insert anything. I also noticed that the types only exist after `prisma generate`, so changing the schema is a three-step loop: edit, migrate, generate. It was slower to start, but the database now rejects a book with a bad `genreId`, and my editor and TypeScript know the exact shape of every model.

## Environment Variables

See `api/.env.example`. Never commit your real `.env`.

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Neon, direct connection) |

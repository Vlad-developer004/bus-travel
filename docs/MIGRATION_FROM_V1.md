# From v1 to v2

| | v1 | v2 |
| --- | --- | --- |
| Frontend | Create React App, React Router, MobX, MUI, per-page CSS | Next.js 16 App Router, Tailwind 4, next-intl, locale routes (`/en`, `/uk`, `/de`, `/pl`) |
| Backend | Express (JavaScript), service/controller split | NestJS (TypeScript): modules, DI, DTO validation, guards, Swagger |
| Database | MongoDB (Mongoose) | PostgreSQL 17 + Prisma, versioned SQL migrations |
| Languages | English, Ukrainian | English, Ukrainian, German, Polish (and a structure that makes the next one a single JSON file) |
| Auth | Tokens returned in the JSON body (readable by page JavaScript), refresh token also in a cookie | Access and refresh tokens only in httpOnly cookies, refresh rotation with reuse detection, roles |
| Payments | Fondy; the callback handler was empty | Provider interface (mock / Stripe), signed + idempotent webhook, auto-refund of late payments |
| Seats | none | seat map, seat holds with expiry, concurrency-safe booking |
| Tickets | e-mail with an HTML table | QR ticket (HMAC-signed), driver validation screen, boarding status |
| Admin | page for creating flights | dashboard (revenue, occupancy, top routes), sortable bookings with cancel/refund and ticket resend, trips, routes, recurring schedules, user roles, invitations of administrators |
| Tests | none | 12 API e2e tests on real PostgreSQL + 7 Playwright browser tests |
| Delivery | `Procfile`, manual | Docker, CI/CD, staging + production, auto-rollback, DB backup before every deploy |

## Data model mapping

| v1 (Mongo) | v2 (Postgres) | Why |
| --- | --- | --- |
| `Flight` with `fromEN/fromUA/toEN/toUA/priceEN/priceUA/typeEN/typeUA` | `Route` (from/to city, duration, base price) + `Trip` (one departure) | v1 duplicated every field per language and stored the price twice. Now names live in `City.names` JSONB and there is one price in EUR; the UI formats it per locale |
| `Flight.isDaily` | `TripTemplate` (time + weekdays) generating `Trip` rows | a boolean could not express "Mon/Wed/Fri at 07:00" |
| `Ticket` (embedded copy of trip data, `isActive`, `emailSent`) | `Booking` (status machine PENDING/PAID/CANCELLED/EXPIRED) + `BookingSeat` | tickets referenced trip data by copy; now it is a relation, with real status |
| `City` (`value`, `ukrainian`, lat, lng) | `City` (`slug`, `names` JSONB, lat, lng, country) | extensible to more languages without a migration |
| `User`, `Token` | `User`, `RefreshToken` (hashed) | refresh tokens are stored as SHA-256 hashes and can be revoked per family |

## Problems found in v1 and how v2 handles them

* A database connection string with credentials was hard-coded in a seed script. v2 reads every secret from the environment and fails at startup if one is missing or weak.
* Admin chat ids were hard-coded in the bot code. Admin access is now a role in the database.
* The payment callback verified nothing and did nothing. v2 verifies the provider signature and processes each event exactly once.
* Ticket e-mails interpolated user input into HTML unescaped. v2 escapes everything and localises per customer.
* Booking was not transactional, so two people could buy the same seat. v2 relies on a database unique constraint.
* Money stored as strings and floats in several shapes. v2 stores integer cents.
* No tests, no pipeline. See the README.

## Why PostgreSQL instead of MongoDB

v1 chose MongoDB deliberately to learn a document store. The domain turned out to be relational (users, bookings, seats, trips, routes), needs transactions and a hard uniqueness guarantee for seats, and benefits from joins for the admin reports. A relational database fits better; MongoDB remains a good choice for data without such relations.

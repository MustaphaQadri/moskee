# Entity Relationship Diagram

Sourced by introspecting the live PostgreSQL database (`information_schema` +
`pg_catalog`), not hand-written from the Prisma schema. The canonical Mermaid
source is [`erd.mmd`](./erd.mmd); the block below is the same diagram so GitHub
renders it.

```mermaid
erDiagram
    User {
        text id PK
        text name
        text email UK
        boolean emailVerified
        text image
        text role "manager | teacher (default teacher)"
        text phone
        timestamp createdAt
        timestamp updatedAt
    }

    Session {
        text id PK
        timestamp expiresAt
        text token UK
        timestamp createdAt
        timestamp updatedAt
        text ipAddress
        text userAgent
        text userId FK
    }

    Account {
        text id PK
        text accountId
        text providerId
        text userId FK
        text accessToken
        text refreshToken
        text idToken
        timestamp accessTokenExpiresAt
        timestamp refreshTokenExpiresAt
        text scope
        text password
        timestamp createdAt
        timestamp updatedAt
    }

    Verification {
        text id PK
        text identifier
        text value
        timestamp expiresAt
        timestamp createdAt
        timestamp updatedAt
    }

    students {
        text id PK
        text firstName
        text lastName
        Sex sex
        timestamp dateOfBirth
        text image "url under /uploads/students"
        timestamp createdAt
        timestamp updatedAt
    }

    guardians {
        text id PK
        text firstName
        text lastName
        text email
        text phone
        text address
        text donationNumber UK "optional, unique when present"
        text educationNumber UK "optional, unique when present"
        timestamp createdAt
        timestamp updatedAt
    }

    student_guardians {
        text id PK
        text studentId FK,UK "unique per guardian"
        text guardianId FK,UK "unique per student"
        text relation "mother | father | ..."
        timestamp createdAt
        timestamp updatedAt
    }

    rooms {
        text id PK
        text name UK
        integer capacity
        text description
        timestamp createdAt
        timestamp updatedAt
    }

    levels {
        text id PK
        text name UK
        integer sortOrder
        timestamp createdAt
        timestamp updatedAt
    }

    class_sessions {
        text id PK
        text label UK "e.g. Zaterdag ochtend"
        text day "Maandag .. Zondag (dropdown)"
        text startTime "HH:mm"
        text endTime "HH:mm"
        timestamp createdAt
        timestamp updatedAt
    }

    classes {
        text id PK
        text name
        text description
        text levelId FK
        text roomId FK
        text teacherId FK
        timestamp createdAt
        timestamp updatedAt
    }

    class_session_links {
        text id PK
        text classId FK,UK "unique per session"
        text sessionId FK,UK "unique per class"
        timestamp createdAt
        timestamp updatedAt
    }

    enrollments {
        text id PK
        text studentId FK,UK "unique per class"
        text classId FK,UK "unique per student"
        timestamp startDate
        timestamp endDate
        text status "active | withdrawn"
        timestamp createdAt
        timestamp updatedAt
    }

    student_comments {
        text id PK
        text studentId FK
        text authorId FK
        text body
        timestamp createdAt
        timestamp updatedAt
    }

    guardian_comments {
        text id PK
        text guardianId FK
        text authorId FK
        text body
        timestamp createdAt
        timestamp updatedAt
    }

    class_comments {
        text id PK
        text classId FK
        text authorId FK
        text body
        timestamp createdAt
        timestamp updatedAt
    }

    academic_years {
        text id PK
        text name UK "e.g. 2026-2027"
        timestamp startDate
        timestamp endDate
        boolean isCurrent "at most one, enforced in app"
        timestamp createdAt
        timestamp updatedAt
    }

    terms {
        text id PK
        text name UK "Termijn 1"
        integer sortOrder UK
        integer startMonth "1..12"
        integer endMonth "1..12, >= startMonth"
        timestamp createdAt
        timestamp updatedAt
    }

    subjects {
        text id PK
        text levelId FK,UK "unique per name"
        text name "Math"
        text description
        text image "url under /uploads/subjects"
        integer sortOrder
        boolean isActive
        timestamp createdAt
        timestamp updatedAt
    }

    attendance {
        text id PK
        text studentId FK,UK "unique per class+session+date"
        text classId FK,UK "unique per student+session+date"
        text sessionId FK,UK "unique per student+class+date"
        timestamp date "DATE (UTC midnight)"
        AttendanceStatus status "PRESENT | LATE | VERY_LATE | ABSENT | EXCUSED"
        text note
        text recordedById FK
        timestamp createdAt
        timestamp updatedAt
    }

    grades {
        text id PK
        text studentId FK,UK "unique per subject+term+year"
        text classId FK
        text subjectId FK,UK "unique per student+term+year"
        text termId FK,UK "unique per student+subject+year"
        text academicYearId FK,UK "unique per student+subject+term"
        integer score "1..10 or null"
        text remark
        text recordedById FK
        timestamp createdAt
        timestamp updatedAt
    }

    donation_settings {
        text id PK "singleton, id = default"
        numeric defaultAmount "Decimal(10,2)"
        timestamp createdAt
        timestamp updatedAt
    }

    student_donations {
        text id PK
        text studentId FK,UK "unique per academicYear"
        text academicYearId FK,UK "unique per student"
        numeric expectedAmount "Decimal(10,2)"
        numeric paidAmount "Decimal(10,2), default 0"
        DonationCategory category "FULL | REDUCED | EXEMPT"
        timestamp paidAt "DATE"
        text note
        text recordedById FK
        timestamp createdAt
        timestamp updatedAt
    }

    User ||--o{ Session : "authenticates via"
    User ||--o{ Account : "authenticates via"
    User |o--o{ classes : "teaches"
    User |o--o{ student_comments : "authors"
    User |o--o{ guardian_comments : "authors"
    User |o--o{ class_comments : "authors"

    students ||--o{ student_guardians : "is linked to"
    guardians ||--o{ student_guardians : "is linked to"

    students ||--o{ enrollments : "enrolls in"
    classes ||--o{ enrollments : "has enrolled"

    classes ||--o{ class_session_links : "runs in"
    class_sessions ||--o{ class_session_links : "schedules"

    levels ||--o{ classes : "classifies"
    rooms |o--o{ classes : "hosts"

    students ||--o{ student_comments : "has"
    guardians ||--o{ guardian_comments : "has"
    classes ||--o{ class_comments : "has"

    students ||--o{ attendance : "has"
    classes ||--o{ attendance : "holds"
    class_sessions ||--o{ attendance : "scheduled in"
    User |o--o{ attendance : "records"

    levels ||--o{ subjects : "offers"
    terms ||--o{ grades : "assesses"
    subjects ||--o{ grades : "graded in"
    students ||--o{ grades : "earns"
    classes ||--o{ grades : "records"
    academic_years ||--o{ grades : "scopes"
    User |o--o{ grades : "records"

    students ||--o{ student_donations : "donates"
    academic_years ||--o{ student_donations : "receives"
    User |o--o{ student_donations : "records"
```

## Legend

- `PK` primary key, `FK` foreign key, `UK` unique key.
- Cardinality: `||--o{` = one (mandatory) to zero-or-many; `|o--o{` = one
  (optional) to zero-or-many.
- Composite unique constraints (marked `UK` on each member column):
  `student_guardians (studentId, guardianId)`,
  `class_session_links (classId, sessionId)`,
  `enrollments (studentId, classId)`,
  `attendance (studentId, classId, sessionId, date)`,
  `terms (name)` and `(sortOrder)` (global periods),
  `subjects (levelId, name)`,
  `grades (studentId, subjectId, termId, academicYearId)`,
  `student_donations (studentId, academicYearId)`.
- `Sex` is a PostgreSQL enum: `MALE | FEMALE`; `AttendanceStatus` is
  `PRESENT | LATE | VERY_LATE | ABSENT | EXCUSED`; `DonationCategory` is
  `FULL | REDUCED | EXEMPT`.
- `_prisma_migrations` (Prisma's bookkeeping table) is omitted — infrastructure,
  not application data.

## Regenerate

The diagram is derived from the database. To refresh it after a migration, dump
the structure and update `erd.mmd`:

```sh
# columns
docker exec moskee-db psql -U moskee -d moskee -c "\d+"
# or a machine-readable dump
pg_dump --schema-only --no-owner --no-privileges "$DATABASE_URL"
```

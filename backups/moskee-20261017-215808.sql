--
-- PostgreSQL database dump
--

\restrict jedYKFvkAldDNOdv01kFArP4QxT9jXpZCV3UT4Oc1ZLh8Ja4UcBLEqSstxEy56e

-- Dumped from database version 15.19
-- Dumped by pg_dump version 15.19

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AttendanceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AttendanceStatus" AS ENUM (
    'PRESENT',
    'ABSENT',
    'LATE',
    'EXCUSED',
    'VERY_LATE'
);


--
-- Name: DonationCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DonationCategory" AS ENUM (
    'FULL',
    'REDUCED',
    'EXEMPT'
);


--
-- Name: DonationPaymentAction; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DonationPaymentAction" AS ENUM (
    'CREATED',
    'UPDATED',
    'DELETED'
);


--
-- Name: Sex; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Sex" AS ENUM (
    'MALE',
    'FEMALE'
);


--
-- Name: StudentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StudentStatus" AS ENUM (
    'WAITING_LIST',
    'ACTIVE',
    'ARCHIVED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Account" (
    id text NOT NULL,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" text NOT NULL,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp(3) without time zone,
    "refreshTokenExpiresAt" timestamp(3) without time zone,
    scope text,
    password text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    token text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" text NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "emailVerified" boolean DEFAULT false NOT NULL,
    image text,
    role text DEFAULT 'teacher'::text NOT NULL,
    phone text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "mustChangePassword" boolean DEFAULT false NOT NULL
);


--
-- Name: Verification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Verification" (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: academic_years; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academic_years (
    id text NOT NULL,
    name text NOT NULL,
    "startDate" date,
    "endDate" date,
    "isCurrent" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "classId" text NOT NULL,
    "sessionId" text NOT NULL,
    date date NOT NULL,
    status public."AttendanceStatus" NOT NULL,
    note text,
    "recordedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: class_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_comments (
    id text NOT NULL,
    "classId" text NOT NULL,
    "authorId" text,
    body text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: class_session_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_session_links (
    id text NOT NULL,
    "classId" text NOT NULL,
    "sessionId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: class_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_sessions (
    id text NOT NULL,
    label text NOT NULL,
    day text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "endTime" text,
    "startTime" text
);


--
-- Name: classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.classes (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "levelId" text NOT NULL,
    "roomId" text,
    "teacherId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: donation_payment_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.donation_payment_logs (
    id text NOT NULL,
    "paymentId" text,
    "studentId" text NOT NULL,
    "academicYearId" text NOT NULL,
    action public."DonationPaymentAction" NOT NULL,
    "amountBefore" numeric(10,2),
    "amountAfter" numeric(10,2),
    "paidAtBefore" date,
    "paidAtAfter" date,
    note text,
    "actorId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: donation_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.donation_payments (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "academicYearId" text NOT NULL,
    amount numeric(10,2) NOT NULL,
    "paidAt" date NOT NULL,
    note text,
    "recordedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: donation_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.donation_settings (
    id text DEFAULT 'default'::text NOT NULL,
    "defaultAmount" numeric(10,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enrollments (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "classId" text NOT NULL,
    "startDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endDate" timestamp(3) without time zone,
    status text DEFAULT 'active'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exams (
    id text NOT NULL,
    "classId" text NOT NULL,
    "subjectId" text NOT NULL,
    "termId" text NOT NULL,
    "academicYearId" text NOT NULL,
    date date NOT NULL,
    coefficient integer DEFAULT 1 NOT NULL,
    "recordedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    title text NOT NULL
);


--
-- Name: grades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grades (
    id text NOT NULL,
    "studentId" text NOT NULL,
    score integer,
    remark text,
    "recordedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "examId" text NOT NULL
);


--
-- Name: guardian_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guardian_comments (
    id text NOT NULL,
    "guardianId" text NOT NULL,
    "authorId" text,
    body text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: guardian_registration_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guardian_registration_tokens (
    id text NOT NULL,
    "guardianId" text NOT NULL,
    token text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "usedAt" timestamp(3) without time zone,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: guardians; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guardians (
    id text NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    email text,
    phone text,
    address text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "donationNumber" text,
    "educationNumber" text
);


--
-- Name: levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.levels (
    id text NOT NULL,
    name text NOT NULL,
    "sortOrder" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: period_report_observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.period_report_observations (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "termId" text NOT NULL,
    "academicYearId" text NOT NULL,
    body text NOT NULL,
    "recordedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: registration_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registration_settings (
    id text DEFAULT 'default'::text NOT NULL,
    "linkValidityDays" integer DEFAULT 30 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rooms (
    id text NOT NULL,
    name text NOT NULL,
    capacity integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    description text
);


--
-- Name: student_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_comments (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "authorId" text,
    body text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: student_donations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_donations (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "academicYearId" text NOT NULL,
    "expectedAmount" numeric(10,2) NOT NULL,
    category public."DonationCategory" DEFAULT 'FULL'::public."DonationCategory" NOT NULL,
    note text,
    "recordedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: student_guardians; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_guardians (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "guardianId" text NOT NULL,
    relation text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: student_status_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_status_events (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "fromStatus" public."StudentStatus",
    "toStatus" public."StudentStatus" NOT NULL,
    "changedById" text,
    "changedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    note text
);


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id text NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    sex public."Sex",
    "dateOfBirth" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    image text,
    status public."StudentStatus" DEFAULT 'WAITING_LIST'::public."StudentStatus" NOT NULL
);


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subjects (
    id text NOT NULL,
    "levelId" text NOT NULL,
    name text NOT NULL,
    "sortOrder" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    description text,
    image text
);


--
-- Name: terms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.terms (
    id text NOT NULL,
    name text NOT NULL,
    "sortOrder" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "startMonth" integer NOT NULL,
    "endMonth" integer NOT NULL
);


--
-- Name: year_report_observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.year_report_observations (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "academicYearId" text NOT NULL,
    body text NOT NULL,
    "recordedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Data for Name: Account; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Account" (id, "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", scope, password, "createdAt", "updatedAt") FROM stdin;
d6002f80-265a-428b-be09-6ab54601c67d	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	credential	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	\N	\N	\N	\N	\N	\N	d86b1b2797c82e7b60fcbde20be6fb43:a64fea3319652938c75d19b759f0e98aeb75ce5709be2ecb5f0785d7f3abf90cc76f438b8746a1361da8b2d708d2af37c8609573af3fc96f485ebac97631640a	2026-09-25 20:26:27.533	2026-09-25 20:26:27.533
43033a23-45ca-44ef-9b8f-55345821ec7c	e9c3b6cd-c6ac-405d-97cc-9b25ee91f2ad	credential	e9c3b6cd-c6ac-405d-97cc-9b25ee91f2ad	\N	\N	\N	\N	\N	\N	696a31b2292c585090d9f282d79d9a2a:5a0e52537015d05e4264dc863b74e0e20cbee7fc181dc725614919ab59905136d97f87f3201544acab74c80fe8115eda156a6ab5a7a6871ffb4e276387bbbfc9	2026-09-25 21:02:38.459	2026-10-02 20:49:38.297
abc2639f-2e15-4696-b2c1-1b1c04d585cf	4e130fd1-f214-4f10-bf5c-1c4b727d1930	credential	4e130fd1-f214-4f10-bf5c-1c4b727d1930	\N	\N	\N	\N	\N	\N	1dd3198f6f02df0deb3438d0e2843cce:5bac38633d184f4ca39322b5dca00eed211e4ed99f327ab5c61385001e5a224b383a69ad71e35c4dac2c4083771031fc20dd872614b100b0c1ffa71d2412c8f6	2026-10-02 20:54:18.807	2026-10-02 20:54:18.807
00104c71-14ea-461a-8832-67edd9de7aff	de9554a3-14cd-46fa-8f73-ffe9ae4d5643	credential	de9554a3-14cd-46fa-8f73-ffe9ae4d5643	\N	\N	\N	\N	\N	\N	242f914dc36338c1241a4cfa6b27aae0:79fc7f4f62b0b5b4dddc46618038ffb7cb6f0aa252ffca5f2f2f5ecfd919ce1249820a32624f2cfb88d99df734afd2f38724c9f9c2a588251c1f8e6bc3a58546	2026-10-17 10:24:08.744	2026-10-17 10:24:08.744
b91aa4ee-5537-49bf-91fb-a585c0a14b91	4f100a5c-bdc1-4d37-a8d5-87102cdfd6ec	credential	4f100a5c-bdc1-4d37-a8d5-87102cdfd6ec	\N	\N	\N	\N	\N	\N	da7dc857fe1ab2dbcb7dda976892f9a3:182869c06b6ba7510cccaf595c296ff942f7c68e7aedbcbd5fb8312040e9bfc6813b48598535fc0cd316ac485af5df049d9b5351d42cad2e0e611c3bc9702450	2026-10-17 10:39:45.005	2026-10-17 17:39:04.31
\.


--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Session" (id, "expiresAt", token, "createdAt", "updatedAt", "ipAddress", "userAgent", "userId") FROM stdin;
Zbqoz9dk9lh6Z6QmgHvT5h2byZbxUthe	2026-10-02 21:46:23.522	gBzjvESrSfMNqOQvdoMI276eJ7xQbemH	2026-09-25 21:46:23.522	2026-09-25 21:46:23.522	0000:0000:0000:0000:0000:0000:0000:0000	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	c724d280-7f41-4b0f-bb24-fc29e1e7f73b
UVhzWY1Cz7veSnBGHcdMRHweg7re9L10	2026-10-06 21:03:16.329	39pCLT8K9fzm0AbSxDv61If82BCkeJEK	2026-09-29 21:03:16.332	2026-09-29 21:03:16.332			c724d280-7f41-4b0f-bb24-fc29e1e7f73b
H7TXirxQLUzkUNIAcpjgR6fo15ubY5tI	2026-10-06 21:03:44.009	sHKYc6XoxcEvmHjjMWvRHt5R15pFLzSB	2026-09-29 21:03:44.01	2026-09-29 21:03:44.01	0000:0000:0000:0000:0000:0000:0000:0000	curl/8.7.1	c724d280-7f41-4b0f-bb24-fc29e1e7f73b
z3uqPkfiFIpMJuC8Fi2lpqRtRBihIQZj	2026-10-06 21:03:52.501	SLcr8Xi3TGs2UQ4EphrwtFsnlwlwIkL1	2026-09-29 21:03:52.502	2026-09-29 21:03:52.502	0000:0000:0000:0000:0000:0000:0000:0000	curl/8.7.1	c724d280-7f41-4b0f-bb24-fc29e1e7f73b
jaz2zEfdgyVj3rxEECIyl3lZKmPOkXzl	2026-10-09 20:48:49.303	0QUBTvIfirDIZ9iqxszlrDeqdfcsi24N	2026-10-02 20:48:49.304	2026-10-02 20:48:49.304	0000:0000:0000:0000:0000:0000:0000:0000	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	e9c3b6cd-c6ac-405d-97cc-9b25ee91f2ad
qa0uXyryXEGn9V3Xl5PnqFFSGxTrpZVW	2026-10-09 20:56:06.017	sfGAVeC4PduUd0GC715GmMpZ7t6W1YE4	2026-10-02 20:56:06.017	2026-10-02 20:56:06.017	0000:0000:0000:0000:0000:0000:0000:0000	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0.1 Safari/605.1.15	4e130fd1-f214-4f10-bf5c-1c4b727d1930
4ScogaTdezPhXfFt7toJ5uwEPftx7X0b	2026-10-15 18:59:30.583	rJ3ksIkL42X3dlw8jjlt8iHNZTgbbwSn	2026-10-02 19:52:29.905	2026-10-08 18:59:30.583	0000:0000:0000:0000:0000:0000:0000:0000	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	c724d280-7f41-4b0f-bb24-fc29e1e7f73b
wWoPYsaAusbkgSdaFUW5SYG24LhwRnjY	2026-10-18 20:57:08.782	8re4N5Vel6zpRSzGKjIg5D3laTapCISD	2026-10-11 20:57:08.783	2026-10-11 20:57:08.783	0000:0000:0000:0000:0000:0000:0000:0000	curl/8.7.1	c724d280-7f41-4b0f-bb24-fc29e1e7f73b
1LBRC0bVXTfdWHgAClJtKi9HjkbGmkQU	2026-10-23 20:36:00.171	so6QEn9ETrQ2DcNbSGhX4r8yBvhHnfrZ	2026-10-11 19:29:40.474	2026-10-16 20:36:00.171	0000:0000:0000:0000:0000:0000:0000:0000	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	c724d280-7f41-4b0f-bb24-fc29e1e7f73b
AGb03aht5TXSCpJPxfApNy0asa0ys7uQ	2026-10-23 20:43:34.212	P9YlqDqEXxhGahmX0jCXM3B1RmTJJB0r	2026-10-16 20:43:34.213	2026-10-16 20:43:34.213	0000:0000:0000:0000:0000:0000:0000:0000	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/155.0.0.0 Safari/537.36	c724d280-7f41-4b0f-bb24-fc29e1e7f73b
Atl2K7467BEVi3dlG7JR1Ku136NyKNJH	2026-10-23 20:44:14	jpvOWa3x55sVhiMTLxgk5Y2osiYlz9MQ	2026-10-16 20:44:14	2026-10-16 20:44:14	0000:0000:0000:0000:0000:0000:0000:0000	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/155.0.0.0 Safari/537.36	c724d280-7f41-4b0f-bb24-fc29e1e7f73b
VJWxqrKj4c2cWrxv8pCCRJgDPBTMIFhx	2026-10-24 08:45:23.563	CbRU29BYgqXjFUsHyTU6smuTffunrqK2	2026-10-17 08:45:23.564	2026-10-17 08:45:23.564	82.75.124.111	Mozilla/5.0 (iPhone; CPU iPhone OS 26_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/147.0.7727.47 Mobile/15E148 Safari/604.1	c724d280-7f41-4b0f-bb24-fc29e1e7f73b
KDiKnc5yrUzKZaiphSyfS17HuDXKC6S1	2026-10-24 16:16:11.942	agK9Vp5dKX4yA3sJdiNck6waqbNCqg2j	2026-10-17 16:16:11.942	2026-10-17 16:16:11.942	194.76.131.42	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36	c724d280-7f41-4b0f-bb24-fc29e1e7f73b
l8b6I5NbSrtoy5ANgw5bhOblAfmqg7C1	2026-10-24 18:00:35.005	2Wesgxq7V2KwXVJmOqD9q1YFB4vippvk	2026-10-17 18:00:35.005	2026-10-17 18:00:35.005	194.76.131.42	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/155.0.0.0 Safari/537.36	c724d280-7f41-4b0f-bb24-fc29e1e7f73b
9vdZrAWYGuigsFnMrZwx4qwlwg9JXi30	2026-10-24 18:11:15.055	F6wgWAsssX8FdQ2SJ2TcDkXAh5TGiSv0	2026-10-17 18:11:15.055	2026-10-17 18:11:15.055	194.76.131.42	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/155.0.0.0 Safari/537.36	c724d280-7f41-4b0f-bb24-fc29e1e7f73b
G0GDVPVNSAbfSErQq881UuoWYnepIm65	2026-10-24 18:16:33.205	V6Yuv7bqtx4AYT26ZiVirho4kVHOTafM	2026-10-17 18:16:33.205	2026-10-17 18:16:33.205	194.76.131.42	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/155.0.0.0 Safari/537.36	c724d280-7f41-4b0f-bb24-fc29e1e7f73b
9BVvQYVTsSEhruM0gzVyq61I60rBP8ws	2026-10-24 18:16:52.836	3F5IYRfUK2ZxnD3tecAf8T6Ii4CGOxwc	2026-10-17 18:16:52.837	2026-10-17 18:16:52.837	194.76.131.42	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/155.0.0.0 Safari/537.36	c724d280-7f41-4b0f-bb24-fc29e1e7f73b
emAwllRfJ6p8AkKDTxA9VlOjfQEtcxZA	2026-10-24 19:18:43.479	GtS6KIIGL0JoowfUPZzP1zniHVAI5uct	2026-10-17 19:18:43.479	2026-10-17 19:18:43.479	194.76.131.42	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/155.0.0.0 Safari/537.36	c724d280-7f41-4b0f-bb24-fc29e1e7f73b
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, name, email, "emailVerified", image, role, phone, "createdAt", "updatedAt", "mustChangePassword") FROM stdin;
c724d280-7f41-4b0f-bb24-fc29e1e7f73b	Hassan lefqih	manager@moskee.local	t	\N	manager	\N	2026-09-25 20:26:27.533	2026-09-25 21:04:23.64	f
e9c3b6cd-c6ac-405d-97cc-9b25ee91f2ad	Qadri	mohammed@qadri.nl	t	\N	teacher	\N	2026-09-25 21:02:38.459	2026-10-02 20:49:38.298	f
4e130fd1-f214-4f10-bf5c-1c4b727d1930	mustapha	mustapha@qadri.nl	t	\N	teacher	\N	2026-10-02 20:54:18.807	2026-10-02 20:54:18.807	f
de9554a3-14cd-46fa-8f73-ffe9ae4d5643	Mustapha	hanifi@casema.nl	t	\N	manager	\N	2026-10-17 10:24:08.744	2026-10-17 10:24:08.744	f
4f100a5c-bdc1-4d37-a8d5-87102cdfd6ec	Ahmed	ahmed@ahmed.com	t	\N	teacher	\N	2026-10-17 10:39:45.005	2026-10-17 17:39:04.313	f
\.


--
-- Data for Name: Verification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Verification" (id, identifier, value, "expiresAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
d3503a82-c1a4-4381-9781-2e7df8383421	b86cf3c399c8a040314611e1f2f8a30714501dfdf7c493eb3ea0ea5772b0cfea	2026-10-08 19:45:45.382351+00	20261008120000_add_exams	\N	\N	2026-10-08 19:45:45.326536+00	1
28665d8d-0326-4635-8923-338b70fc5b1c	8c3000784bda6d5601fd3d2c8452e9641cee3af6d38dfa94732162f8f9eb1c6d	2026-10-08 20:14:58.024849+00	20261008130000_add_exam_title	\N	\N	2026-10-08 20:14:58.015092+00	1
b59fce3f-7028-4274-9c62-7ec19183745c	f6ebafac98265d0e161476625032096ced6510b36c89ad5563aa62a5d255a628	2026-09-18 21:19:21.108982+00	20260918211921_add_grades_subjects	\N	\N	2026-09-18 21:19:21.066552+00	1
95902c7c-32cf-4ad2-92bc-959572a4a844	89936aca5ce35ff000c8f708837fabc12d9eee82b7328e9a9741905a0d2d4155	2026-09-18 19:59:05.210559+00	20260918195905_init	\N	\N	2026-09-18 19:59:05.115032+00	1
2e7a69e9-8b01-4c43-871c-71a453710199	4f0ec7a50621ce03f6bb99a5e3a023728940324698ecfda3e338b80f819b5af6	2026-09-18 20:52:57.223438+00	20260918205257_add_attendance	\N	\N	2026-09-18 20:52:57.204812+00	1
7fe522bb-f025-4267-8fef-3dd910659940	2561f3c8fd3e81073d838e95a4be87d18ed5ab481de988939ec1ffb1bf2a3c3e	2026-09-18 21:41:22.273552+00	20260918214122_add_donations	\N	\N	2026-09-18 21:41:22.252142+00	1
0a41d69a-8cd7-46a1-8fb5-827161c89dc5	dcc0e56a872f4b92d73124517edb432346827389ee75ed4e34df52097327ff84	2026-09-25 19:59:12.015117+00	20260925120000_add_guardian_numbers	\N	\N	2026-09-25 19:59:11.997804+00	1
a3e87ef2-3823-46ba-8beb-3971dffcbe23	6de04985b507de067c06122f10f50126626e4ee2bf60095f256f9d5886fb91d8	2026-10-08 21:25:10.628062+00	20261008140000_add_report_messages	\N	\N	2026-10-08 21:25:10.592526+00	1
21cc7697-0b5d-4856-879b-09994d07c587	58b18f9f791fdfdb3a036ecff2bbfaa8bd0a3ff27f65ff93b7ec51b9ddbe712b	2026-09-25 22:22:46.499099+00	20260926120000_rooms_competencies_timeslots	\N	\N	2026-09-25 22:22:46.475805+00	1
4f57de6e-8b3d-4841-a418-d669573f6d19	fd44b9581f06cc97a30f2d3c60413790078b166cf88fa20d6075caa3bac52830	2026-10-02 20:18:06.917786+00	20260927120000_global_periods_subject_image	\N	\N	2026-10-02 20:18:06.883481+00	1
c521f333-c3e2-478d-b27a-2814c39b3996	49feb615fa9a797e2880a44ebfa48ca1ce1c59af23ea25be495b5a64847ef5d9	2026-10-02 20:25:52.389645+00	20260927130000_drop_competencies	\N	\N	2026-10-02 20:25:52.377818+00	1
f6b90a0c-a009-41bc-92a4-bc4dcd16d602	f6e7eda5accb4b1078bec6a72b6c9d465812fe23e2a2572cabc7f58e188f1b52	2026-10-08 21:43:21.710196+00	20261008150000_rename_report_observations	\N	\N	2026-10-08 21:43:21.693166+00	1
bd47136d-0f53-4677-a42a-31440e20d217	a1e4573b2f225c24c61176cc76d615d1a720d638cfbc7976cf8b7c20c45594c8	2026-10-02 20:45:12.173392+00	20260927140000_must_change_password	\N	\N	2026-10-02 20:45:12.163152+00	1
22648ed8-ab2d-4b79-8a3c-4f395349df2a	e08516685c7f12135bbe5fbbc654e82e079b90c1fa833680a3035ccaa5009384	2026-10-02 21:02:40.345424+00	20260927150000_drop_primary_and_sex_other	\N	\N	2026-10-02 21:02:40.324665+00	1
32180de7-7c73-4f7c-a894-5a1a6dfbbd0e	f9515a6adec47ba7ebe973bbdbaecfe684f6e33b89f6d8d89369c5d3053c5c44	2026-10-02 21:28:18.399297+00	20260927160000_add_very_late_attendance	\N	\N	2026-10-02 21:28:18.389673+00	1
56de7846-a2cc-4383-959d-46f79df11d28	2ed8d875391252d5f1eda520efc541b36ca68ff3a645c58e9c5b026cd413c290	2026-10-11 20:49:34.958805+00	20261011204916_student_status_and_payments	\N	\N	2026-10-11 20:49:34.916779+00	1
ac0bfdbd-b4aa-4f7d-8c9a-9c0b376219f5	604a5a2bba2cbe654532f9aae7853545d496b10e3b662cef14dbb8f2c1abbd32	2026-10-02 21:54:19.050637+00	20260927170000_add_student_image	\N	\N	2026-10-02 21:54:19.041646+00	1
fafac343-8119-4e73-bbda-13e49a04963b	0107f611c5da92be68480dd4af599c685ef3c131f1667537f2403603cafd567f	2026-10-17 19:18:09.310068+00	20261017185714_guardian_registration_links	\N	\N	2026-10-17 19:18:09.141081+00	1
\.


--
-- Data for Name: academic_years; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.academic_years (id, name, "startDate", "endDate", "isCurrent", "createdAt", "updatedAt") FROM stdin;
cmuhjm5hy00007g6di3jovxng	2026 - 2027	2026-09-12	2027-06-27	t	2026-09-25 22:39:11.446	2026-10-02 19:58:28.009
cmuzz99nt000oe26divmsytcg	2025 - 2026	2025-09-01	2026-06-30	f	2026-10-08 20:16:55.337	2026-10-08 20:16:55.337
\.


--
-- Data for Name: attendance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attendance (id, "studentId", "classId", "sessionId", date, status, note, "recordedById", "createdAt", "updatedAt") FROM stdin;
cmurhdlpq000o0f6ds9h94juu	cmu7hhica0003wf6douagakq8	cmurfyruk00080f6d8lhcn2ow	cmuhhi7u400033j6d04y9ccks	2026-10-04	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:15.086	2026-10-02 21:34:15.086
cmurhdlpt000p0f6d7azlcw16	cmu7frmin0005bu6d1xbejq4r	cmurfyruk00080f6d8lhcn2ow	cmuhhi7u400033j6d04y9ccks	2026-10-04	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:15.089	2026-10-02 21:34:15.089
cmurhdlpv000q0f6dpdn96qcl	cmu7hhicc0004wf6d2j1q5ax0	cmurfyruk00080f6d8lhcn2ow	cmuhhi7u400033j6d04y9ccks	2026-10-04	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:15.091	2026-10-02 21:34:15.091
cmurhdlpy000r0f6debus5b4b	cmu7hhpxj0004zi6d12f4dimi	cmurfyruk00080f6d8lhcn2ow	cmuhhi7u400033j6d04y9ccks	2026-10-04	LATE	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:15.094	2026-10-02 21:34:15.094
cmurhdlq0000s0f6dd597fqua	cmuhekihn0001rh6d15jyg2fx	cmurfyruk00080f6d8lhcn2ow	cmuhhi7u400033j6d04y9ccks	2026-10-04	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:15.096	2026-10-02 21:34:15.096
cmurhdlq2000t0f6dwquo0j9n	cmuhf6pjg00014v6dvgk9vzvl	cmurfyruk00080f6d8lhcn2ow	cmuhhi7u400033j6d04y9ccks	2026-10-04	LATE	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:15.098	2026-10-02 21:34:15.098
cmurhdlq4000u0f6dbfyxsid6	cmu7frmik0004bu6dk2ziwe61	cmurfyruk00080f6d8lhcn2ow	cmuhhi7u400033j6d04y9ccks	2026-10-04	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:15.1	2026-10-02 21:34:15.1
cmurhdtf4000v0f6ddayw1st2	cmu7hhica0003wf6douagakq8	cmurfyruk00080f6d8lhcn2ow	cmuhhi7u400033j6d04y9ccks	2026-10-10	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:25.072	2026-10-02 21:34:25.072
cmurhdtf6000w0f6dv04qi7f6	cmu7frmin0005bu6d1xbejq4r	cmurfyruk00080f6d8lhcn2ow	cmuhhi7u400033j6d04y9ccks	2026-10-10	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:25.074	2026-10-02 21:34:25.074
cmurhdtf7000x0f6d6byajvh2	cmu7hhicc0004wf6d2j1q5ax0	cmurfyruk00080f6d8lhcn2ow	cmuhhi7u400033j6d04y9ccks	2026-10-10	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:25.075	2026-10-02 21:34:25.075
cmurhdtf8000y0f6dmmoikclc	cmu7hhpxj0004zi6d12f4dimi	cmurfyruk00080f6d8lhcn2ow	cmuhhi7u400033j6d04y9ccks	2026-10-10	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:25.076	2026-10-02 21:34:25.076
cmurhdtf9000z0f6dkzy2vie8	cmuhekihn0001rh6d15jyg2fx	cmurfyruk00080f6d8lhcn2ow	cmuhhi7u400033j6d04y9ccks	2026-10-10	LATE	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:25.077	2026-10-02 21:34:25.077
cmurhdtfa00100f6dq7h9sz0j	cmuhf6pjg00014v6dvgk9vzvl	cmurfyruk00080f6d8lhcn2ow	cmuhhi7u400033j6d04y9ccks	2026-10-10	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:25.078	2026-10-02 21:34:25.078
cmurhdtfc00110f6dmj2yej00	cmu7frmik0004bu6dk2ziwe61	cmurfyruk00080f6d8lhcn2ow	cmuhhi7u400033j6d04y9ccks	2026-10-10	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:25.08	2026-10-02 21:34:25.08
cmurhe6u200190f6dl68agi9j	cmu7hhica0003wf6douagakq8	cmurfyruk00080f6d8lhcn2ow	cmuhhi7t800003j6ds4rzl4v5	2026-10-09	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:42.458	2026-10-02 21:34:42.458
cmurhe6u5001a0f6d9fv3xxp4	cmu7frmin0005bu6d1xbejq4r	cmurfyruk00080f6d8lhcn2ow	cmuhhi7t800003j6ds4rzl4v5	2026-10-09	LATE	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:42.461	2026-10-02 21:34:42.461
cmurhe6u7001b0f6dd42n54m8	cmu7hhicc0004wf6d2j1q5ax0	cmurfyruk00080f6d8lhcn2ow	cmuhhi7t800003j6ds4rzl4v5	2026-10-09	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:42.463	2026-10-02 21:34:42.463
cmurhe6u8001c0f6d2eracvmu	cmu7hhpxj0004zi6d12f4dimi	cmurfyruk00080f6d8lhcn2ow	cmuhhi7t800003j6ds4rzl4v5	2026-10-09	LATE	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:42.464	2026-10-02 21:34:42.464
cmurhe6u9001d0f6d7000vk54	cmuhekihn0001rh6d15jyg2fx	cmurfyruk00080f6d8lhcn2ow	cmuhhi7t800003j6ds4rzl4v5	2026-10-09	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:42.465	2026-10-02 21:34:42.465
cmurhe6ua001e0f6d2t40z7pf	cmuhf6pjg00014v6dvgk9vzvl	cmurfyruk00080f6d8lhcn2ow	cmuhhi7t800003j6ds4rzl4v5	2026-10-09	LATE	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:42.466	2026-10-02 21:34:42.466
cmurhe6ub001f0f6di2vyx11m	cmu7frmik0004bu6dk2ziwe61	cmurfyruk00080f6d8lhcn2ow	cmuhhi7t800003j6ds4rzl4v5	2026-10-09	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:42.467	2026-10-02 21:34:42.467
cmurhei7s001g0f6daosldqvw	cmu7hhica0003wf6douagakq8	cmurfyruk00080f6d8lhcn2ow	cmuhhi7u400033j6d04y9ccks	2026-10-09	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:57.208	2026-10-02 21:34:57.208
cmurhei7t001h0f6duvks0ivr	cmu7frmin0005bu6d1xbejq4r	cmurfyruk00080f6d8lhcn2ow	cmuhhi7u400033j6d04y9ccks	2026-10-09	LATE	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:57.209	2026-10-02 21:34:57.209
cmurhei7u001i0f6d8inn80wj	cmu7hhicc0004wf6d2j1q5ax0	cmurfyruk00080f6d8lhcn2ow	cmuhhi7u400033j6d04y9ccks	2026-10-09	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:57.21	2026-10-02 21:34:57.21
cmurhei7v001j0f6dqdl7h6pc	cmu7hhpxj0004zi6d12f4dimi	cmurfyruk00080f6d8lhcn2ow	cmuhhi7u400033j6d04y9ccks	2026-10-09	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:57.211	2026-10-02 21:34:57.211
cmurhdwgz00120f6dqffey9ze	cmu7hhica0003wf6douagakq8	cmurfyruk00080f6d8lhcn2ow	cmuhhi7t800003j6ds4rzl4v5	2026-10-03	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:29.027	2026-10-02 21:47:23.468
cmurhdwh400130f6dcufdg0jk	cmu7frmin0005bu6d1xbejq4r	cmurfyruk00080f6d8lhcn2ow	cmuhhi7t800003j6ds4rzl4v5	2026-10-03	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:29.032	2026-10-02 21:47:23.47
cmurhdwh900140f6d44jx8822	cmu7hhicc0004wf6d2j1q5ax0	cmurfyruk00080f6d8lhcn2ow	cmuhhi7t800003j6ds4rzl4v5	2026-10-03	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:29.037	2026-10-02 21:47:23.471
cmurhdwhc00150f6due5lofia	cmu7hhpxj0004zi6d12f4dimi	cmurfyruk00080f6d8lhcn2ow	cmuhhi7t800003j6ds4rzl4v5	2026-10-03	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:29.041	2026-10-02 21:47:23.472
cmurhdwhf00160f6dj2dfwsre	cmuhekihn0001rh6d15jyg2fx	cmurfyruk00080f6d8lhcn2ow	cmuhhi7t800003j6ds4rzl4v5	2026-10-03	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:29.043	2026-10-02 21:47:23.473
cmurhdwhi00170f6dhmwxzntn	cmuhf6pjg00014v6dvgk9vzvl	cmurfyruk00080f6d8lhcn2ow	cmuhhi7t800003j6ds4rzl4v5	2026-10-03	EXCUSED	Slaapkop	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:29.046	2026-10-02 21:47:23.474
cmurhdwhl00180f6dwsyfla5i	cmu7frmik0004bu6dk2ziwe61	cmurfyruk00080f6d8lhcn2ow	cmuhhi7t800003j6ds4rzl4v5	2026-10-03	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:29.049	2026-10-02 21:47:23.476
cmurhei7w001k0f6d6hnpeu96	cmuhekihn0001rh6d15jyg2fx	cmurfyruk00080f6d8lhcn2ow	cmuhhi7u400033j6d04y9ccks	2026-10-09	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:57.212	2026-10-02 21:34:57.212
cmurhei7x001l0f6dw0qsjehj	cmuhf6pjg00014v6dvgk9vzvl	cmurfyruk00080f6d8lhcn2ow	cmuhhi7u400033j6d04y9ccks	2026-10-09	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:57.213	2026-10-02 21:34:57.213
cmurhei7y001m0f6di2b26k25	cmu7frmik0004bu6dk2ziwe61	cmurfyruk00080f6d8lhcn2ow	cmuhhi7u400033j6d04y9ccks	2026-10-09	PRESENT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-02 21:34:57.214	2026-10-02 21:34:57.214
cmvcaaivu000i01ryj6v4vsxi	cmu7hhica0003wf6douagakq8	cmvc9nx0r000601rytht9l9lj	cmuhhi7u000013j6d1hcns7ja	2026-10-17	PRESENT	\N	4f100a5c-bdc1-4d37-a8d5-87102cdfd6ec	2026-10-17 10:59:03.834	2026-10-17 10:59:03.834
cmvcaaiwb000j01ry2fw20cki	cmu7frmin0005bu6d1xbejq4r	cmvc9nx0r000601rytht9l9lj	cmuhhi7u000013j6d1hcns7ja	2026-10-17	PRESENT	\N	4f100a5c-bdc1-4d37-a8d5-87102cdfd6ec	2026-10-17 10:59:03.851	2026-10-17 10:59:03.851
cmvcaaiwf000k01ry90lxgc8k	cmu7hhicc0004wf6d2j1q5ax0	cmvc9nx0r000601rytht9l9lj	cmuhhi7u000013j6d1hcns7ja	2026-10-17	EXCUSED	\N	4f100a5c-bdc1-4d37-a8d5-87102cdfd6ec	2026-10-17 10:59:03.855	2026-10-17 10:59:03.855
cmvcaaiwi000l01ryxc2idy3x	cmvc9rz0k000a01ryjvbmzflc	cmvc9nx0r000601rytht9l9lj	cmuhhi7u000013j6d1hcns7ja	2026-10-17	ABSENT	\N	4f100a5c-bdc1-4d37-a8d5-87102cdfd6ec	2026-10-17 10:59:03.858	2026-10-17 10:59:03.858
\.


--
-- Data for Name: class_comments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.class_comments (id, "classId", "authorId", body, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: class_session_links; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.class_session_links (id, "classId", "sessionId", "createdAt", "updatedAt") FROM stdin;
cmuhhye3q000ab16dnx5bng3q	cmuhhy04n0007b16do66y2o0y	cmuhhi7t800003j6ds4rzl4v5	2026-09-25 21:52:43.234	2026-09-25 21:52:43.234
cmuhhye3q000bb16dz1ep7hzg	cmuhhy04n0007b16do66y2o0y	cmuhhi7u400033j6d04y9ccks	2026-09-25 21:52:43.234	2026-09-25 21:52:43.234
cmuhi23pf000gb16d0i10hsdq	cmuhi23pd000fb16d9e47esd5	cmuhhi7u000013j6d1hcns7ja	2026-09-25 21:55:36.385	2026-09-25 21:55:36.385
cmuhi23pf000hb16dnvjlvuk3	cmuhi23pd000fb16d9e47esd5	cmuhhi7u600043j6d0ykpb96r	2026-09-25 21:55:36.385	2026-09-25 21:55:36.385
cmuzycqat0001666dpd2n2kmz	cmurfyruk00080f6d8lhcn2ow	cmuhhi7u400033j6d04y9ccks	2026-10-08 19:51:37.24	2026-10-08 19:51:37.24
cmuzycqat0002666de7n3m8ot	cmurfyruk00080f6d8lhcn2ow	cmuhhi7t800003j6ds4rzl4v5	2026-10-08 19:51:37.24	2026-10-08 19:51:37.24
cmvc9nx11000701rylkletrns	cmvc9nx0r000601rytht9l9lj	cmuhhi7u000013j6d1hcns7ja	2026-10-17 10:41:29.067	2026-10-17 10:41:29.067
cmvc9nx11000801ryub17yhfm	cmvc9nx0r000601rytht9l9lj	cmuhhi7u600043j6d0ykpb96r	2026-10-17 10:41:29.067	2026-10-17 10:41:29.067
\.


--
-- Data for Name: class_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.class_sessions (id, label, day, "createdAt", "updatedAt", "endTime", "startTime") FROM stdin;
cmuhhi7t800003j6ds4rzl4v5	Zaterdag ochtend	Zaterdag	2026-09-25 21:40:08.589	2026-10-16 21:34:52.74	12:00	09:00
cmuhhi7u000013j6d1hcns7ja	Zaterdag middag	Zaterdag	2026-09-25 21:40:08.616	2026-10-16 21:34:52.829	15:00	12:00
cmuhhi7u300023j6df6dk0val	Zaterdag namiddag	Zaterdag	2026-09-25 21:40:08.619	2026-10-16 21:34:52.837	18:00	15:00
cmuhhi7u400033j6d04y9ccks	Zondag ochtend	Zondag	2026-09-25 21:40:08.62	2026-10-16 21:34:52.842	12:00	09:00
cmuhhi7u600043j6d0ykpb96r	Zondag middag	Zondag	2026-09-25 21:40:08.622	2026-10-16 21:34:52.846	15:00	12:00
cmuhhi7u700053j6dwa7p265o	Zondag namiddag	Zondag	2026-09-25 21:40:08.623	2026-10-16 21:34:52.85	18:00	15:00
\.


--
-- Data for Name: classes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.classes (id, name, description, "levelId", "roomId", "teacherId", "createdAt", "updatedAt") FROM stdin;
cmuhhy04n0007b16do66y2o0y	Klas A	\N	cmuhhs3tw0000b16dt3vyjoxl	cmuhhvtow0005b16dvond9z61	e9c3b6cd-c6ac-405d-97cc-9b25ee91f2ad	2026-09-25 21:52:25.127	2026-09-25 21:52:43.234
cmuhi23pd000fb16d9e47esd5	Klas B	\N	cmuhhs8tp0001b16dttc1x8ci	cmuhhvzri0006b16dujdfvuxx	e9c3b6cd-c6ac-405d-97cc-9b25ee91f2ad	2026-09-25 21:55:36.385	2026-09-25 21:55:36.385
cmurfyruk00080f6d8lhcn2ow	Klass c	\N	cmuhhs3tw0000b16dt3vyjoxl	cmuhhvzri0006b16dujdfvuxx	4e130fd1-f214-4f10-bf5c-1c4b727d1930	2026-10-02 20:54:43.58	2026-10-08 19:51:37.24
cmvc9nx0r000601rytht9l9lj	Ahmed	\N	cmuhhshwq0002b16dmj4ohr4u	cmuhhvtow0005b16dvond9z61	4f100a5c-bdc1-4d37-a8d5-87102cdfd6ec	2026-10-17 10:41:29.067	2026-10-17 10:41:29.067
\.


--
-- Data for Name: donation_payment_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.donation_payment_logs (id, "paymentId", "studentId", "academicYearId", action, "amountBefore", "amountAfter", "paidAtBefore", "paidAtAfter", note, "actorId", "createdAt") FROM stdin;
cmv4bbmb10002ct6dd9ain3r5	cmv4bbmaw0001ct6d8ieshnte	cmu7frmin0005bu6d1xbejq4r	cmuhjm5hy00007g6di3jovxng	CREATED	\N	20.00	\N	2026-10-11	rest volgende maand	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-11 21:05:45.133
cmv4bbrrp0003ct6dup1xhxtg	cmv4bbmaw0001ct6d8ieshnte	cmu7frmin0005bu6d1xbejq4r	cmuhjm5hy00007g6di3jovxng	UPDATED	20.00	10.00	2026-10-11	2026-10-11	rest volgende maand	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-11 21:05:52.213
cmv4bc9jq0005ct6dhm5loxqh	cmv4bc9jo0004ct6d3phgse2a	cmu7frmin0005bu6d1xbejq4r	cmuhjm5hy00007g6di3jovxng	CREATED	\N	60.00	\N	2026-10-08	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-11 21:06:15.254
cmvbi03iy000201rylr6366tw	cmvbi03iq000101ry4e8yfbu8	cmu7hhpxg0003zi6dvao419n1	cmuhjm5hy00007g6di3jovxng	CREATED	\N	115.00	\N	2026-10-16	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-16 21:47:08.122
cmvc8wd4c000501ryew0lc1nj	cmvc8wd42000401ryosasuvcr	cmuhf9t7s00034v6dkw96dyi3	cmuhjm5hy00007g6di3jovxng	CREATED	\N	115.00	\N	2026-10-17	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-17 10:20:03.564
\.


--
-- Data for Name: donation_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.donation_payments (id, "studentId", "academicYearId", amount, "paidAt", note, "recordedById", "createdAt", "updatedAt") FROM stdin;
cmv4bbmaw0001ct6d8ieshnte	cmu7frmin0005bu6d1xbejq4r	cmuhjm5hy00007g6di3jovxng	10.00	2026-10-11	rest volgende maand	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-11 21:05:45.129	2026-10-11 21:05:52.212
cmv4bc9jo0004ct6d3phgse2a	cmu7frmin0005bu6d1xbejq4r	cmuhjm5hy00007g6di3jovxng	60.00	2026-10-08	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-11 21:06:15.252	2026-10-11 21:06:15.252
cmvbi03iq000101ry4e8yfbu8	cmu7hhpxg0003zi6dvao419n1	cmuhjm5hy00007g6di3jovxng	115.00	2026-10-16	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-16 21:47:08.114	2026-10-16 21:47:08.114
cmvc8wd42000401ryosasuvcr	cmuhf9t7s00034v6dkw96dyi3	cmuhjm5hy00007g6di3jovxng	115.00	2026-10-17	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-17 10:20:03.554	2026-10-17 10:20:03.554
\.


--
-- Data for Name: donation_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.donation_settings (id, "defaultAmount", "createdAt", "updatedAt") FROM stdin;
default	115.00	2026-09-18 21:41:53.831	2026-10-16 21:46:28.842
\.


--
-- Data for Name: enrollments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.enrollments (id, "studentId", "classId", "startDate", "endDate", status, "createdAt", "updatedAt") FROM stdin;
cmurfsznh00040f6dx9wode55	cmuhekihn0001rh6d15jyg2fx	cmuhhy04n0007b16do66y2o0y	2026-10-02 20:50:13.757	2026-10-02 20:56:59.228	withdrawn	2026-10-02 20:50:13.757	2026-10-02 20:56:59.229
cmurft0w300070f6dq369s6um	cmu7hhicc0004wf6d2j1q5ax0	cmuhhy04n0007b16do66y2o0y	2026-10-02 20:50:15.363	2026-10-02 20:56:59.228	withdrawn	2026-10-02 20:50:15.363	2026-10-02 20:56:59.229
cmurg1oio000g0f6d9tjl7k04	cmuhekihn0001rh6d15jyg2fx	cmurfyruk00080f6d8lhcn2ow	2026-10-02 20:56:59.232	\N	active	2026-10-02 20:56:59.232	2026-10-02 20:56:59.232
cmuhjqunn00057g6dcg8qqwqx	cmu7frmin0005bu6d1xbejq4r	cmuhi23pd000fb16d9e47esd5	2026-09-25 22:42:50.675	2026-10-02 20:35:02.432	withdrawn	2026-09-25 22:42:50.675	2026-10-02 20:35:02.432
cmuhjqjjc00047g6dd8mfhgd9	cmu7hhpxj0004zi6d12f4dimi	cmuhi23pd000fb16d9e47esd5	2026-09-25 22:42:36.264	2026-10-02 20:35:04.409	withdrawn	2026-09-25 22:42:36.264	2026-10-02 20:35:04.409
cmuhhzojg000db16dt4ij55sr	cmuhf9t7s00034v6dkw96dyi3	cmuhhy04n0007b16do66y2o0y	2026-09-25 21:53:43.42	2026-10-02 20:57:53.714	withdrawn	2026-09-25 21:53:43.42	2026-10-02 20:57:53.714
cmuhi284d000ib16dt1yaz9h6	cmuhf9t7s00034v6dkw96dyi3	cmuhi23pd000fb16d9e47esd5	2026-09-25 21:55:42.109	\N	active	2026-09-25 21:55:42.109	2026-10-02 20:57:53.715
cmurfsxy700010f6d381229jr	cmu7hhpxg0003zi6dvao419n1	cmuhhy04n0007b16do66y2o0y	2026-10-02 20:50:11.551	\N	active	2026-10-02 20:50:11.551	2026-10-02 20:50:11.551
cmurfaxn70004yd6dptotbs3l	cmuhf6pjg00014v6dvgk9vzvl	cmuhi23pd000fb16d9e47esd5	2026-10-02 20:36:11.347	2026-10-02 20:50:12.844	withdrawn	2026-10-02 20:36:11.347	2026-10-02 20:50:12.845
cmurfsy8q00020f6dy8gvbk7m	cmu7hhica0003wf6douagakq8	cmuhhy04n0007b16do66y2o0y	2026-10-02 20:50:11.93	2026-10-02 20:54:50.824	withdrawn	2026-10-02 20:50:11.93	2026-10-02 20:54:50.825
cmurfsxi600000f6dzxrgavnz	cmu7frmin0005bu6d1xbejq4r	cmuhhy04n0007b16do66y2o0y	2026-10-02 20:50:10.974	2026-10-02 20:54:51.419	withdrawn	2026-10-02 20:50:10.974	2026-10-02 20:54:51.419
cmurft02m00050f6dqd21pfd6	cmu7hhpxj0004zi6d12f4dimi	cmuhhy04n0007b16do66y2o0y	2026-10-02 20:50:14.302	2026-10-02 20:54:51.944	withdrawn	2026-10-02 20:50:14.302	2026-10-02 20:54:51.944
cmurfyyax000d0f6dmfbxnz9x	cmu7hhpxj0004zi6d12f4dimi	cmurfyruk00080f6d8lhcn2ow	2026-10-02 20:54:51.945	\N	active	2026-10-02 20:54:51.945	2026-10-02 20:54:51.945
cmurft0ix00060f6d06d4o04x	cmu7frmik0004bu6dk2ziwe61	cmuhhy04n0007b16do66y2o0y	2026-10-02 20:50:14.889	2026-10-02 20:54:53.14	withdrawn	2026-10-02 20:50:14.889	2026-10-02 20:54:53.14
cmurfyz86000e0f6d5n71gr2w	cmu7frmik0004bu6dk2ziwe61	cmurfyruk00080f6d8lhcn2ow	2026-10-02 20:54:53.142	\N	active	2026-10-02 20:54:53.142	2026-10-02 20:54:53.142
cmuhhzhqj000cb16dvpln9wgx	cmuhf6pjg00014v6dvgk9vzvl	cmuhhy04n0007b16do66y2o0y	2026-09-25 21:53:34.603	2026-10-02 20:54:54.34	withdrawn	2026-09-25 21:53:34.603	2026-10-02 20:54:54.34
cmurfz05i000f0f6dtb4ehvcp	cmuhf6pjg00014v6dvgk9vzvl	cmurfyruk00080f6d8lhcn2ow	2026-10-02 20:54:54.342	\N	active	2026-10-02 20:54:54.342	2026-10-02 20:54:54.342
cmvc9t0e4000c01rylzt30xhb	cmvc9rz0k000a01ryjvbmzflc	cmvc9nx0r000601rytht9l9lj	2026-10-17 10:45:26.716	\N	active	2026-10-17 10:45:26.716	2026-10-17 10:45:26.716
cmurg1oiq000h0f6dy6ze8vjv	cmu7hhicc0004wf6d2j1q5ax0	cmurfyruk00080f6d8lhcn2ow	2026-10-02 20:56:59.234	2026-10-17 10:54:21.268	withdrawn	2026-10-02 20:56:59.234	2026-10-17 10:54:21.274
cmurfyxfu000b0f6dqjarukkn	cmu7hhica0003wf6douagakq8	cmurfyruk00080f6d8lhcn2ow	2026-10-02 20:54:50.826	2026-10-17 10:54:21.268	withdrawn	2026-10-02 20:54:50.826	2026-10-17 10:54:21.274
cmurfyxwc000c0f6d27m7vx4f	cmu7frmin0005bu6d1xbejq4r	cmurfyruk00080f6d8lhcn2ow	2026-10-02 20:54:51.42	2026-10-17 10:54:21.268	withdrawn	2026-10-02 20:54:51.42	2026-10-17 10:54:21.274
cmvca4gv6000f01ryokltdzc5	cmu7hhica0003wf6douagakq8	cmvc9nx0r000601rytht9l9lj	2026-10-17 10:54:21.283	\N	active	2026-10-17 10:54:21.283	2026-10-17 10:54:21.283
cmvca4gvh000g01ryg9ovrlhj	cmu7frmin0005bu6d1xbejq4r	cmvc9nx0r000601rytht9l9lj	2026-10-17 10:54:21.293	\N	active	2026-10-17 10:54:21.293	2026-10-17 10:54:21.293
cmvca4gvl000h01rygfqje8ob	cmu7hhicc0004wf6d2j1q5ax0	cmvc9nx0r000601rytht9l9lj	2026-10-17 10:54:21.297	\N	active	2026-10-17 10:54:21.297	2026-10-17 10:54:21.297
cmv4bg0ww0008ct6d41djx3kf	cmv4beub20006ct6dl95d15g8	cmurfyruk00080f6d8lhcn2ow	2026-10-11 21:09:10.688	2026-10-17 19:26:29.412	withdrawn	2026-10-11 21:09:10.688	2026-10-17 19:26:29.416
\.


--
-- Data for Name: exams; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.exams (id, "classId", "subjectId", "termId", "academicYearId", date, coefficient, "recordedById", "createdAt", "updatedAt", title) FROM stdin;
cmuzzn9bu0000tb6d96dls4b8	cmurfyruk00080f6d8lhcn2ow	cmuhhun0m0004b16dx0abachg	cmuhjncbq00017g6d3glxc9oh	cmuhjm5hy00007g6di3jovxng	2026-10-08	1	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:27:48.09	2026-10-08 20:27:48.09	fatiha
cmuzznse70008tb6d6uqzne1n	cmurfyruk00080f6d8lhcn2ow	cmuhhun0m0004b16dx0abachg	cmuhjncbq00017g6d3glxc9oh	cmuhjm5hy00007g6di3jovxng	2026-10-08	1	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:28:12.799	2026-10-08 20:28:12.799	nas
cmuzzoe88000gtb6dpnbw2x0s	cmurfyruk00080f6d8lhcn2ow	cmuzwptjp0000666da2gf1e10	cmuhjncbq00017g6d3glxc9oh	cmuhjm5hy00007g6di3jovxng	2026-10-08	1	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:28:41.096	2026-10-08 20:28:41.096	hoofdstuk 1
cmuzzs4tg000otb6d8onwvymu	cmurfyruk00080f6d8lhcn2ow	cmuhhu1f60003b16dfkcdtcs1	cmuhjncbq00017g6d3glxc9oh	cmuhjm5hy00007g6di3jovxng	2026-10-08	1	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:31:35.524	2026-10-08 20:31:35.524	alif
cmuzzspmy000wtb6d306nk2fa	cmurfyruk00080f6d8lhcn2ow	cmuhhun0m0004b16dx0abachg	cmuhjnzih00027g6dqcn26vnl	cmuhjm5hy00007g6di3jovxng	2026-10-08	1	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:32:02.506	2026-10-08 20:32:02.506	kafiroun
cmuzztcy9001btb6dgoyr81ce	cmurfyruk00080f6d8lhcn2ow	cmuhhu1f60003b16dfkcdtcs1	cmuhjnzih00027g6dqcn26vnl	cmuhjm5hy00007g6di3jovxng	2026-10-08	1	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:32:32.721	2026-10-08 20:32:32.721	b
cmuzzttep001jtb6dtw2ad49v	cmurfyruk00080f6d8lhcn2ow	cmuzwptjp0000666da2gf1e10	cmuhjnzih00027g6dqcn26vnl	cmuhjm5hy00007g6di3jovxng	2026-10-08	1	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:32:54.049	2026-10-08 20:32:54.049	hoofdtuk 2
cmuzzuix2001rtb6doc9xidsf	cmurfyruk00080f6d8lhcn2ow	cmuzwptjp0000666da2gf1e10	cmuhjotxs00037g6drh9jegfr	cmuhjm5hy00007g6di3jovxng	2026-10-08	1	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:33:27.11	2026-10-08 20:33:27.11	hoodfdstuk 3
cmuzzuze4001ztb6d8c6msxvv	cmurfyruk00080f6d8lhcn2ow	cmuhhun0m0004b16dx0abachg	cmuhjotxs00037g6drh9jegfr	cmuhjm5hy00007g6di3jovxng	2026-10-08	1	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:33:48.46	2026-10-08 20:33:48.46	mumtahina
cmuzzvlm00027tb6dcda6xzlg	cmurfyruk00080f6d8lhcn2ow	cmuhhu1f60003b16dfkcdtcs1	cmuhjotxs00037g6drh9jegfr	cmuhjm5hy00007g6di3jovxng	2026-10-08	1	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:34:17.256	2026-10-08 20:34:17.256	t
cmv00p0ia002ftb6dgsqlkr4o	cmurfyruk00080f6d8lhcn2ow	cmuhhu1f60003b16dfkcdtcs1	cmuhjncbq00017g6d3glxc9oh	cmuzz99nt000oe26divmsytcg	2026-10-08	1	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:57:09.586	2026-10-08 20:57:09.586	letter g
cmv485ci40000hy6du52hmi1r	cmurfyruk00080f6d8lhcn2ow	cmuhhu1f60003b16dfkcdtcs1	cmuhjncbq00017g6d3glxc9oh	cmuhjm5hy00007g6di3jovxng	2026-10-11	1	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-11 19:36:53.644	2026-10-11 19:36:53.644	hfst3
cmvcar16h000m01ryi2plkxg9	cmvc9nx0r000601rytht9l9lj	cmurf6c5l0000yd6dt9ur8ke0	cmuhjncbq00017g6d3glxc9oh	cmuhjm5hy00007g6di3jovxng	2026-10-17	1	4f100a5c-bdc1-4d37-a8d5-87102cdfd6ec	2026-10-17 11:11:54.041	2026-10-17 11:11:54.041	van 1 tot 5
\.


--
-- Data for Name: grades; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.grades (id, "studentId", score, remark, "recordedById", "createdAt", "updatedAt", "examId") FROM stdin;
cmuzznjb00001tb6d5sbrll9c	cmu7hhica0003wf6douagakq8	4	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:28:01.02	2026-10-08 20:28:01.02	cmuzzn9bu0000tb6d96dls4b8
cmuzznjb40002tb6dien3vwqc	cmu7frmin0005bu6d1xbejq4r	8	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:28:01.024	2026-10-08 20:28:01.024	cmuzzn9bu0000tb6d96dls4b8
cmuzznjb50003tb6daf9oc77v	cmu7hhicc0004wf6d2j1q5ax0	9	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:28:01.025	2026-10-08 20:28:01.025	cmuzzn9bu0000tb6d96dls4b8
cmuzznjb60004tb6ddb899qik	cmu7hhpxj0004zi6d12f4dimi	8	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:28:01.026	2026-10-08 20:28:01.026	cmuzzn9bu0000tb6d96dls4b8
cmuzznjb80005tb6dff7f9hfo	cmuhekihn0001rh6d15jyg2fx	7	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:28:01.028	2026-10-08 20:28:01.028	cmuzzn9bu0000tb6d96dls4b8
cmuzznjb90006tb6ddyu2bmhe	cmuhf6pjg00014v6dvgk9vzvl	6	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:28:01.029	2026-10-08 20:28:01.029	cmuzzn9bu0000tb6d96dls4b8
cmuzznjba0007tb6d37fa3hm0	cmu7frmik0004bu6dk2ziwe61	7	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:28:01.03	2026-10-08 20:28:01.03	cmuzzn9bu0000tb6d96dls4b8
cmuzznxfc0009tb6d63ztrdr0	cmu7hhica0003wf6douagakq8	7	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:28:19.32	2026-10-08 20:28:19.32	cmuzznse70008tb6d6uqzne1n
cmuzznxff000atb6ds13sxj3v	cmu7frmin0005bu6d1xbejq4r	7	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:28:19.323	2026-10-08 20:28:19.323	cmuzznse70008tb6d6uqzne1n
cmuzznxfh000btb6dn27ykmpr	cmu7hhicc0004wf6d2j1q5ax0	8	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:28:19.325	2026-10-08 20:28:19.325	cmuzznse70008tb6d6uqzne1n
cmuzznxfj000ctb6dougfb8ts	cmu7hhpxj0004zi6d12f4dimi	7	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:28:19.327	2026-10-08 20:28:19.327	cmuzznse70008tb6d6uqzne1n
cmuzznxfk000dtb6d2uadpyex	cmuhekihn0001rh6d15jyg2fx	5	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:28:19.328	2026-10-08 20:28:19.328	cmuzznse70008tb6d6uqzne1n
cmuzznxfl000etb6da7xkqlpv	cmuhf6pjg00014v6dvgk9vzvl	9	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:28:19.329	2026-10-08 20:28:19.329	cmuzznse70008tb6d6uqzne1n
cmuzznxfn000ftb6d203ksj4x	cmu7frmik0004bu6dk2ziwe61	5	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:28:19.331	2026-10-08 20:28:19.331	cmuzznse70008tb6d6uqzne1n
cmuzzok3j000htb6dxh61hdd9	cmu7hhica0003wf6douagakq8	6	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:28:48.703	2026-10-08 20:28:48.703	cmuzzoe88000gtb6dpnbw2x0s
cmuzzok3l000itb6dwfflpqgi	cmu7frmin0005bu6d1xbejq4r	8	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:28:48.705	2026-10-08 20:28:48.705	cmuzzoe88000gtb6dpnbw2x0s
cmuzzok3n000jtb6db8bejrbo	cmu7hhicc0004wf6d2j1q5ax0	8	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:28:48.707	2026-10-08 20:28:48.707	cmuzzoe88000gtb6dpnbw2x0s
cmuzzok3o000ktb6d3f7das1c	cmu7hhpxj0004zi6d12f4dimi	6	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:28:48.708	2026-10-08 20:28:48.708	cmuzzoe88000gtb6dpnbw2x0s
cmuzzok3q000ltb6d7puniod4	cmuhekihn0001rh6d15jyg2fx	4	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:28:48.71	2026-10-08 20:28:48.71	cmuzzoe88000gtb6dpnbw2x0s
cmuzzok3t000mtb6dxebxkffu	cmuhf6pjg00014v6dvgk9vzvl	9	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:28:48.713	2026-10-08 20:28:48.713	cmuzzoe88000gtb6dpnbw2x0s
cmuzzok3u000ntb6d55qbjcv0	cmu7frmik0004bu6dk2ziwe61	6	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:28:48.714	2026-10-08 20:28:48.714	cmuzzoe88000gtb6dpnbw2x0s
cmuzzsasv000ptb6d8cfwe3l5	cmu7hhica0003wf6douagakq8	7	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:31:43.279	2026-10-08 20:31:43.279	cmuzzs4tg000otb6d8onwvymu
cmuzzsasy000qtb6d7dafutoa	cmu7frmin0005bu6d1xbejq4r	8	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:31:43.282	2026-10-08 20:31:43.282	cmuzzs4tg000otb6d8onwvymu
cmuzzsasz000rtb6dga9ygp61	cmu7hhicc0004wf6d2j1q5ax0	5	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:31:43.284	2026-10-08 20:31:43.284	cmuzzs4tg000otb6d8onwvymu
cmuzzsat1000stb6dpr9go9pq	cmu7hhpxj0004zi6d12f4dimi	7	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:31:43.285	2026-10-08 20:31:43.285	cmuzzs4tg000otb6d8onwvymu
cmuzzsat2000ttb6d7cwyxs8t	cmuhekihn0001rh6d15jyg2fx	6	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:31:43.286	2026-10-08 20:31:43.286	cmuzzs4tg000otb6d8onwvymu
cmuzzsat3000utb6dy64uwwuz	cmuhf6pjg00014v6dvgk9vzvl	8	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:31:43.287	2026-10-08 20:31:43.287	cmuzzs4tg000otb6d8onwvymu
cmuzzsat4000vtb6duqzxkkj4	cmu7frmik0004bu6dk2ziwe61	6	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:31:43.288	2026-10-08 20:31:43.288	cmuzzs4tg000otb6d8onwvymu
cmuzzsupd000xtb6de8muswa9	cmu7hhica0003wf6douagakq8	7	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:32:09.073	2026-10-08 20:32:09.931	cmuzzspmy000wtb6d306nk2fa
cmuzzsupe000ytb6dmdtqu6gm	cmu7frmin0005bu6d1xbejq4r	5	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:32:09.074	2026-10-08 20:32:09.932	cmuzzspmy000wtb6d306nk2fa
cmuzzsupg000ztb6dxqebqga9	cmu7hhicc0004wf6d2j1q5ax0	8	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:32:09.076	2026-10-08 20:32:09.933	cmuzzspmy000wtb6d306nk2fa
cmuzzsuph0010tb6depfcgyg1	cmu7hhpxj0004zi6d12f4dimi	5	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:32:09.077	2026-10-08 20:32:09.934	cmuzzspmy000wtb6d306nk2fa
cmuzzsupi0011tb6d82ng2wzp	cmuhekihn0001rh6d15jyg2fx	6	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:32:09.079	2026-10-08 20:32:09.936	cmuzzspmy000wtb6d306nk2fa
cmuzzsupk0012tb6dp2zg8ey1	cmuhf6pjg00014v6dvgk9vzvl	5	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:32:09.08	2026-10-08 20:32:09.936	cmuzzspmy000wtb6d306nk2fa
cmuzzsupl0013tb6dfsh0xzwf	cmu7frmik0004bu6dk2ziwe61	6	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:32:09.081	2026-10-08 20:32:09.938	cmuzzspmy000wtb6d306nk2fa
cmuzzticl001ctb6dc645c6nn	cmu7hhica0003wf6douagakq8	7	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:32:39.717	2026-10-08 20:32:39.717	cmuzztcy9001btb6dgoyr81ce
cmuzzticn001dtb6dul6x2hv4	cmu7frmin0005bu6d1xbejq4r	7	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:32:39.719	2026-10-08 20:32:39.719	cmuzztcy9001btb6dgoyr81ce
cmuzztico001etb6dsjtbmnpu	cmu7hhicc0004wf6d2j1q5ax0	5	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:32:39.72	2026-10-08 20:32:39.72	cmuzztcy9001btb6dgoyr81ce
cmuzzticp001ftb6dxil99ha9	cmu7hhpxj0004zi6d12f4dimi	6	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:32:39.721	2026-10-08 20:32:39.721	cmuzztcy9001btb6dgoyr81ce
cmuzzticq001gtb6dqssgxmr2	cmuhekihn0001rh6d15jyg2fx	5	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:32:39.722	2026-10-08 20:32:39.722	cmuzztcy9001btb6dgoyr81ce
cmuzzticr001htb6dufkss788	cmuhf6pjg00014v6dvgk9vzvl	6	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:32:39.723	2026-10-08 20:32:39.723	cmuzztcy9001btb6dgoyr81ce
cmuzztics001itb6d4l2dwv77	cmu7frmik0004bu6dk2ziwe61	8	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:32:39.724	2026-10-08 20:32:39.724	cmuzztcy9001btb6dgoyr81ce
cmuzzu0m0001ktb6dta9rk9p9	cmu7hhica0003wf6douagakq8	8	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:33:03.384	2026-10-08 20:33:03.384	cmuzzttep001jtb6dtw2ad49v
cmuzzu0m2001ltb6d7ez4wrgp	cmu7frmin0005bu6d1xbejq4r	4	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:33:03.386	2026-10-08 20:33:03.386	cmuzzttep001jtb6dtw2ad49v
cmuzzu0m3001mtb6dehbuktzs	cmu7hhicc0004wf6d2j1q5ax0	6	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:33:03.387	2026-10-08 20:33:03.387	cmuzzttep001jtb6dtw2ad49v
cmuzzu0m5001ntb6d5neyfvvr	cmu7hhpxj0004zi6d12f4dimi	5	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:33:03.389	2026-10-08 20:33:03.389	cmuzzttep001jtb6dtw2ad49v
cmuzzu0m6001otb6dgui8v7eu	cmuhekihn0001rh6d15jyg2fx	8	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:33:03.39	2026-10-08 20:33:03.39	cmuzzttep001jtb6dtw2ad49v
cmuzzu0m7001ptb6ddjtk5641	cmuhf6pjg00014v6dvgk9vzvl	7	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:33:03.391	2026-10-08 20:33:03.391	cmuzzttep001jtb6dtw2ad49v
cmuzzu0m8001qtb6dkdqszzlo	cmu7frmik0004bu6dk2ziwe61	6	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:33:03.392	2026-10-08 20:33:03.392	cmuzzttep001jtb6dtw2ad49v
cmuzzuodi001stb6dt3ao8t0l	cmu7hhica0003wf6douagakq8	8	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:33:34.183	2026-10-08 20:33:34.183	cmuzzuix2001rtb6doc9xidsf
cmuzzuodl001ttb6dpoglt4bv	cmu7frmin0005bu6d1xbejq4r	9	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:33:34.185	2026-10-08 20:33:34.185	cmuzzuix2001rtb6doc9xidsf
cmuzzuodm001utb6dgq7862pe	cmu7hhicc0004wf6d2j1q5ax0	10	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:33:34.186	2026-10-08 20:33:34.186	cmuzzuix2001rtb6doc9xidsf
cmuzzuodo001vtb6d8vpk8s75	cmu7hhpxj0004zi6d12f4dimi	6	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:33:34.188	2026-10-08 20:33:34.188	cmuzzuix2001rtb6doc9xidsf
cmuzzuodq001wtb6dl3hyq478	cmuhekihn0001rh6d15jyg2fx	7	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:33:34.19	2026-10-08 20:33:34.19	cmuzzuix2001rtb6doc9xidsf
cmuzzuods001xtb6dodemg93k	cmuhf6pjg00014v6dvgk9vzvl	7	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:33:34.192	2026-10-08 20:33:34.192	cmuzzuix2001rtb6doc9xidsf
cmuzzuodt001ytb6do4u9thsp	cmu7frmik0004bu6dk2ziwe61	5	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:33:34.193	2026-10-08 20:33:34.193	cmuzzuix2001rtb6doc9xidsf
cmuzzv6270020tb6dk35de31g	cmu7hhica0003wf6douagakq8	5	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:33:57.103	2026-10-08 20:33:57.103	cmuzzuze4001ztb6d8c6msxvv
cmuzzv62b0021tb6dnnkx8u7t	cmu7frmin0005bu6d1xbejq4r	6	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:33:57.107	2026-10-08 20:33:57.107	cmuzzuze4001ztb6d8c6msxvv
cmuzzv62d0022tb6doersjyer	cmu7hhicc0004wf6d2j1q5ax0	6	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:33:57.109	2026-10-08 20:33:57.109	cmuzzuze4001ztb6d8c6msxvv
cmuzzv62f0023tb6d1fjm6yeg	cmu7hhpxj0004zi6d12f4dimi	6	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:33:57.111	2026-10-08 20:33:57.111	cmuzzuze4001ztb6d8c6msxvv
cmuzzv62g0024tb6df7ot603q	cmuhekihn0001rh6d15jyg2fx	7	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:33:57.112	2026-10-08 20:33:57.112	cmuzzuze4001ztb6d8c6msxvv
cmuzzv62i0025tb6d1hunuley	cmuhf6pjg00014v6dvgk9vzvl	6	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:33:57.114	2026-10-08 20:33:57.114	cmuzzuze4001ztb6d8c6msxvv
cmuzzv62k0026tb6dbwsg7nfg	cmu7frmik0004bu6dk2ziwe61	7	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:33:57.116	2026-10-08 20:33:57.116	cmuzzuze4001ztb6d8c6msxvv
cmuzzvrbz0028tb6dwhh9xoo0	cmu7hhica0003wf6douagakq8	6	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:34:24.671	2026-10-08 20:34:24.671	cmuzzvlm00027tb6dcda6xzlg
cmuzzvrc20029tb6d4qhskx41	cmu7frmin0005bu6d1xbejq4r	8	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:34:24.674	2026-10-08 20:34:24.674	cmuzzvlm00027tb6dcda6xzlg
cmuzzvrc4002atb6dbjv3y8yd	cmu7hhicc0004wf6d2j1q5ax0	6	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:34:24.676	2026-10-08 20:34:24.676	cmuzzvlm00027tb6dcda6xzlg
cmuzzvrc6002btb6dd1jk0ali	cmu7hhpxj0004zi6d12f4dimi	7	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:34:24.678	2026-10-08 20:34:24.678	cmuzzvlm00027tb6dcda6xzlg
cmuzzvrc7002ctb6du2m0k606	cmuhekihn0001rh6d15jyg2fx	7	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:34:24.679	2026-10-08 20:34:24.679	cmuzzvlm00027tb6dcda6xzlg
cmuzzvrc9002dtb6djk2l36c4	cmuhf6pjg00014v6dvgk9vzvl	6	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:34:24.681	2026-10-08 20:34:24.681	cmuzzvlm00027tb6dcda6xzlg
cmuzzvrcb002etb6dczkwgi8o	cmu7frmik0004bu6dk2ziwe61	7	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:34:24.683	2026-10-08 20:34:24.683	cmuzzvlm00027tb6dcda6xzlg
cmv00p76j002gtb6d9p1j9dd2	cmu7hhica0003wf6douagakq8	7	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:57:18.235	2026-10-08 20:57:18.235	cmv00p0ia002ftb6dgsqlkr4o
cmv00p76m002htb6dsd1pujus	cmu7hhicc0004wf6d2j1q5ax0	6	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:57:18.238	2026-10-08 20:57:18.238	cmv00p0ia002ftb6dgsqlkr4o
cmv00p76o002itb6d9k7aaf9a	cmuhekihn0001rh6d15jyg2fx	6	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:57:18.24	2026-10-08 20:57:18.24	cmv00p0ia002ftb6dgsqlkr4o
cmv00p76p002jtb6dd7ir8bwm	cmuhf6pjg00014v6dvgk9vzvl	6	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:57:18.241	2026-10-08 20:57:18.241	cmv00p0ia002ftb6dgsqlkr4o
cmv00p76q002ktb6dr478863b	cmu7frmik0004bu6dk2ziwe61	7	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 20:57:18.242	2026-10-08 20:57:18.242	cmv00p0ia002ftb6dgsqlkr4o
cmv485o4s0001hy6df491pnzv	cmu7hhica0003wf6douagakq8	5	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-11 19:37:08.716	2026-10-11 19:37:08.716	cmv485ci40000hy6du52hmi1r
cmv485o510002hy6dmfpwpufv	cmu7frmin0005bu6d1xbejq4r	4	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-11 19:37:08.725	2026-10-11 19:37:08.725	cmv485ci40000hy6du52hmi1r
cmv485o530003hy6drl9utnbp	cmu7hhicc0004wf6d2j1q5ax0	5	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-11 19:37:08.728	2026-10-11 19:37:08.728	cmv485ci40000hy6du52hmi1r
cmv485o560004hy6dtx6twxrx	cmu7hhpxj0004zi6d12f4dimi	6	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-11 19:37:08.73	2026-10-11 19:37:08.73	cmv485ci40000hy6du52hmi1r
cmv485o570005hy6dovqfniks	cmuhekihn0001rh6d15jyg2fx	4	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-11 19:37:08.731	2026-10-11 19:37:08.731	cmv485ci40000hy6du52hmi1r
cmv485o590006hy6dfjwuse8h	cmuhf6pjg00014v6dvgk9vzvl	5	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-11 19:37:08.733	2026-10-11 19:37:08.733	cmv485ci40000hy6du52hmi1r
cmv485o5a0007hy6d0vtpu8fi	cmu7frmik0004bu6dk2ziwe61	8	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-11 19:37:08.734	2026-10-11 19:37:08.734	cmv485ci40000hy6du52hmi1r
\.


--
-- Data for Name: guardian_comments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.guardian_comments (id, "guardianId", "authorId", body, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: guardian_registration_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.guardian_registration_tokens (id, "guardianId", token, "expiresAt", "usedAt", "createdById", "createdAt") FROM stdin;
\.


--
-- Data for Name: guardians; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.guardians (id, "firstName", "lastName", email, phone, address, "createdAt", "updatedAt", "donationNumber", "educationNumber") FROM stdin;
cmuhf6pje00004v6dx6m1byfq	Mohammed	Qadri	mohammed@gmail.com	06182756112	Joop Geesinkweg 909	2026-09-25 20:35:12.458	2026-09-25 20:35:12.458	86183	7867a
cmurg651i000j0f6dazxz2pbm	Mustap	qadri	Qadri.m@gmail.com	\N	25 de Mayo 4115	2026-10-02 21:00:27.27	2026-10-02 21:00:27.27	\N	\N
cmvc9rz0e000901ryyr9o40nj	jkhbdfkj	ergeqrgver	sfjlkjrnk@gvbmf.nl	62165696	eyhtrthtr6	2026-10-17 10:44:38.271	2026-10-17 19:28:22.927	7989	\N
cmvcsyxww000101p2a1l4xu5f	hassan	lamin	\N	\N	\N	2026-10-17 19:41:56.144	2026-10-17 19:41:56.144	\N	\N
\.


--
-- Data for Name: levels; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.levels (id, name, "sortOrder", "createdAt", "updatedAt") FROM stdin;
cmuhhs3tw0000b16dt3vyjoxl	Niveau 1	1	2026-09-25 21:47:49.988	2026-09-25 21:47:49.988
cmuhhs8tp0001b16dttc1x8ci	Niveau 2	2	2026-09-25 21:47:56.461	2026-09-25 21:48:00.383
cmuhhshwq0002b16dmj4ohr4u	Niveau 3	3	2026-09-25 21:48:08.234	2026-09-25 21:48:08.234
\.


--
-- Data for Name: period_report_observations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.period_report_observations (id, "studentId", "termId", "academicYearId", body, "recordedById", "createdAt", "updatedAt") FROM stdin;
cmv02i53a0000q66dyamse3qf	cmu7hhica0003wf6douagakq8	cmuhjncbq00017g6d3glxc9oh	cmuhjm5hy00007g6di3jovxng	Quran kan beter	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 21:47:48.166	2026-10-08 21:47:48.166
cmv02ilos0001q66d6nroq6e5	cmu7frmin0005bu6d1xbejq4r	cmuhjncbq00017g6d3glxc9oh	cmuhjm5hy00007g6di3jovxng	heel goed in dictee, fatiha niet perfexct, beter oefenen	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 21:48:09.676	2026-10-08 21:48:09.676
cmv02j46n0002q66de6p4itds	cmu7hhicc0004wf6d2j1q5ax0	cmuhjncbq00017g6d3glxc9oh	cmuhjm5hy00007g6di3jovxng	Dictee is onvoldoende, iets te aanwezig!	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 21:48:33.647	2026-10-08 21:48:33.647
cmv02jajz0003q66d75smxuvu	cmu7hhpxj0004zi6d12f4dimi	cmuhjncbq00017g6d3glxc9oh	cmuhjm5hy00007g6di3jovxng	netjes	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 21:48:41.903	2026-10-08 21:48:41.903
\.


--
-- Data for Name: registration_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.registration_settings (id, "linkValidityDays", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: rooms; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rooms (id, name, capacity, "createdAt", "updatedAt", description) FROM stdin;
cmuhhvtow0005b16dvond9z61	BG-1	30	2026-09-25 21:50:43.472	2026-09-25 21:50:43.472	\N
cmuhhvzri0006b16dujdfvuxx	BG-2	30	2026-09-25 21:50:51.342	2026-09-25 21:50:51.342	\N
\.


--
-- Data for Name: student_comments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_comments (id, "studentId", "authorId", body, "createdAt", "updatedAt") FROM stdin;
cmuhi03ar000eb16dpnkv29qg	cmuhf9t7s00034v6dkw96dyi3	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	hij doet het niet goed	2026-09-25 21:54:02.547	2026-09-25 21:54:02.547
cmurhw0k200210f6dtatk6y5u	cmuhf6pjg00014v6dvgk9vzvl	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	hello dit is een test	2026-10-02 21:48:34.13	2026-10-02 21:48:34.13
cmurhy6hz00220f6dwoxbu2te	cmuhf6pjg00014v6dvgk9vzvl	4e130fd1-f214-4f10-bf5c-1c4b727d1930	ik ben er ook	2026-10-02 21:50:15.143	2026-10-02 21:50:15.143
\.


--
-- Data for Name: student_donations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_donations (id, "studentId", "academicYearId", "expectedAmount", category, note, "recordedById", "createdAt", "updatedAt") FROM stdin;
cmv4bbmaq0000ct6dws4bl16s	cmu7frmin0005bu6d1xbejq4r	cmuhjm5hy00007g6di3jovxng	100.00	FULL	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-11 21:05:45.122	2026-10-11 21:05:45.122
cmv4bg0x8000act6dcjxh5hw9	cmv4beub20006ct6dl95d15g8	cmuhjm5hy00007g6di3jovxng	0.00	EXEMPT	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-11 21:09:10.7	2026-10-11 21:09:10.7
cmvbi03ig000001ry15e86qp3	cmu7hhpxg0003zi6dvao419n1	cmuhjm5hy00007g6di3jovxng	115.00	FULL	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-16 21:47:08.104	2026-10-16 21:47:08.104
cmvc8wd3p000301rybypj6jgq	cmuhf9t7s00034v6dkw96dyi3	cmuhjm5hy00007g6di3jovxng	115.00	FULL	\N	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-17 10:20:03.541	2026-10-17 10:20:03.541
cmvc9t0g1000e01ryyz7j0u1v	cmvc9rz0k000a01ryjvbmzflc	cmuhjm5hy00007g6di3jovxng	115.00	FULL	\N	de9554a3-14cd-46fa-8f73-ffe9ae4d5643	2026-10-17 10:45:26.786	2026-10-17 10:45:26.786
\.


--
-- Data for Name: student_guardians; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_guardians (id, "studentId", "guardianId", relation, "createdAt", "updatedAt") FROM stdin;
cmuhf6pji00024v6di8xujjjx	cmuhf6pjg00014v6dvgk9vzvl	cmuhf6pje00004v6dx6m1byfq	Vader	2026-09-25 20:35:12.458	2026-09-25 20:35:12.458
cmuhf9t7u00044v6d34500hv9	cmuhf9t7s00034v6dkw96dyi3	cmuhf6pje00004v6dx6m1byfq	Vader	2026-09-25 20:37:37.192	2026-09-25 20:37:37.192
cmurg651n000l0f6du9npnvon	cmurg651k000k0f6dqg7ond1w	cmurg651i000j0f6dazxz2pbm	Vader	2026-10-02 21:00:27.27	2026-10-02 21:00:27.27
cmurg6mph000n0f6dzjhr38o2	cmurg6mpf000m0f6d9jqiiogg	cmurg651i000j0f6dazxz2pbm	Vader	2026-10-02 21:00:50.163	2026-10-02 21:00:50.163
cmv4beub50007ct6d339hh3lw	cmv4beub20006ct6dl95d15g8	cmuhf6pje00004v6dx6m1byfq	Vader	2026-10-11 21:08:15.47	2026-10-11 21:08:15.47
cmvc9rz0r000b01ryhskz26lz	cmvc9rz0k000a01ryjvbmzflc	cmvc9rz0e000901ryyr9o40nj	Vader	2026-10-17 10:44:38.271	2026-10-17 10:44:38.271
\.


--
-- Data for Name: student_status_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_status_events (id, "studentId", "fromStatus", "toStatus", "changedById", "changedAt", note) FROM stdin;
8d640352-44c7-467d-a745-7a4d2ee60dea	cmurg651k000k0f6dqg7ond1w	\N	WAITING_LIST	\N	2026-10-02 21:00:27.27	Geïmporteerd
7fa7a8b2-b843-4e63-8ff3-3376a2a360f9	cmurg6mpf000m0f6d9jqiiogg	\N	WAITING_LIST	\N	2026-10-02 21:00:50.163	Geïmporteerd
6fd903a6-202d-4fe5-b29a-67795293075f	cmu7frmin0005bu6d1xbejq4r	\N	ACTIVE	\N	2026-09-18 20:53:46.559	Geïmporteerd
bdf82f46-6fc5-47aa-a663-e46ab44a53b1	cmu7hhicc0004wf6d2j1q5ax0	\N	ACTIVE	\N	2026-09-18 21:41:53.82	Geïmporteerd
939bc1d5-473c-46d2-bb67-1ab13fcf3553	cmu7hhpxg0003zi6dvao419n1	\N	ACTIVE	\N	2026-09-18 21:42:03.652	Geïmporteerd
6fea37df-4c02-4934-9851-488f6c7bcc72	cmu7hhpxj0004zi6d12f4dimi	\N	ACTIVE	\N	2026-09-18 21:42:03.655	Geïmporteerd
900d16f6-25b7-4ee5-abcc-c8d3ffc8068b	cmuhekihn0001rh6d15jyg2fx	\N	ACTIVE	\N	2026-09-25 20:17:56.885	Geïmporteerd
545e92fe-d052-435f-bc8d-39f96f712538	cmuhf6pjg00014v6dvgk9vzvl	\N	ACTIVE	\N	2026-09-25 20:35:12.458	Geïmporteerd
fdcf3a84-0529-4d40-ab19-ee9dde1a9030	cmuhf9t7s00034v6dkw96dyi3	\N	ACTIVE	\N	2026-09-25 20:37:37.192	Geïmporteerd
4663ee09-7ca7-4738-97ca-2d2b376e2ff3	cmu7frmik0004bu6dk2ziwe61	\N	ACTIVE	\N	2026-09-18 20:53:46.556	Geïmporteerd
a7ef164c-07ee-4ec7-bbb4-fc5b883e4ba6	cmu7hhica0003wf6douagakq8	\N	ACTIVE	\N	2026-09-18 21:41:53.818	Geïmporteerd
cmv4bg0x40009ct6dzvg14qgf	cmv4beub20006ct6dl95d15g8	WAITING_LIST	ACTIVE	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-11 21:09:10.696	\N
cmvc9t0ex000d01rydgd547ou	cmvc9rz0k000a01ryjvbmzflc	WAITING_LIST	ACTIVE	de9554a3-14cd-46fa-8f73-ffe9ae4d5643	2026-10-17 10:45:26.745	\N
cmvcsf2v2000001p2xt6aoeej	cmv4beub20006ct6dl95d15g8	ACTIVE	ARCHIVED	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-17 19:26:29.438	\N
\.


--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.students (id, "firstName", "lastName", sex, "dateOfBirth", "createdAt", "updatedAt", image, status) FROM stdin;
cmurg651k000k0f6dqg7ond1w	Aya	qadri	FEMALE	2017-01-01 00:00:00	2026-10-02 21:00:27.27	2026-10-02 21:00:27.27	\N	WAITING_LIST
cmurg6mpf000m0f6d9jqiiogg	noor	qadri	FEMALE	2021-01-01 00:00:00	2026-10-02 21:00:50.163	2026-10-02 21:00:50.163	\N	WAITING_LIST
cmu7frmin0005bu6d1xbejq4r	Bob	Able	\N	2015-02-02 00:00:00	2026-09-18 20:53:46.559	2026-09-18 20:53:46.559	\N	ACTIVE
cmu7hhicc0004wf6d2j1q5ax0	Bob	Baker	\N	2015-02-02 00:00:00	2026-09-18 21:41:53.82	2026-09-18 21:41:53.82	\N	ACTIVE
cmu7hhpxg0003zi6dvao419n1	Alice	Able	\N	2015-01-01 00:00:00	2026-09-18 21:42:03.652	2026-09-18 21:42:03.652	\N	ACTIVE
cmu7hhpxj0004zi6d12f4dimi	Bob	Baker	\N	2015-02-02 00:00:00	2026-09-18 21:42:03.655	2026-09-18 21:42:03.655	\N	ACTIVE
cmuhekihn0001rh6d15jyg2fx	Test	Kind	FEMALE	2015-04-01 00:00:00	2026-09-25 20:17:56.885	2026-09-25 20:17:56.885	\N	ACTIVE
cmuhf6pjg00014v6dvgk9vzvl	jafar	Qadri	MALE	2020-06-12 00:00:00	2026-09-25 20:35:12.458	2026-09-25 20:35:12.458	\N	ACTIVE
cmuhf9t7s00034v6dkw96dyi3	aammar	qadri	MALE	2020-01-01 00:00:00	2026-09-25 20:37:37.192	2026-09-25 20:37:37.192	\N	ACTIVE
cmu7frmik0004bu6dk2ziwe61	Alice	Zed	\N	2015-01-01 00:00:00	2026-09-18 20:53:46.556	2026-10-02 21:56:24.074	\N	ACTIVE
cmu7hhica0003wf6douagakq8	Alice	Able	FEMALE	2015-01-01 00:00:00	2026-09-18 21:41:53.818	2026-10-02 22:13:53.371	/uploads/students/44e7060a-dbe8-449d-90cb-6f937df87ca6.jpg	ACTIVE
cmvc9rz0k000a01ryjvbmzflc	Ali	Lkdhfiwn	MALE	2015-06-17 00:00:00	2026-10-17 10:44:38.271	2026-10-17 10:45:26.738	/uploads/students/c2dd8b16-3c38-48da-b0e0-69c2143743d1.jpg	ACTIVE
cmv4beub20006ct6dl95d15g8	Maryam	Qadri	FEMALE	1999-01-01 00:00:00	2026-10-11 21:08:15.47	2026-10-17 19:26:29.43	/uploads/students/980482b4-4ec4-4332-b8dc-c62b210d9f64.jpg	ARCHIVED
\.


--
-- Data for Name: subjects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subjects (id, "levelId", name, "sortOrder", "isActive", "createdAt", "updatedAt", description, image) FROM stdin;
cmuhik908000jb16dyg9m5nzl	cmuhhs8tp0001b16dttc1x8ci	2 القرآن الكريم	2	t	2026-09-25 22:09:43.064	2026-09-25 22:09:43.064	\N	\N
cmuhhun0m0004b16dx0abachg	cmuhhs3tw0000b16dt3vyjoxl	1 القرآن الكريم	1	t	2026-09-25 21:49:48.166	2026-10-02 20:23:49.084	Surat fatiha tot kafiroun	/uploads/subjects/516afff1-7b2b-4247-abbe-3c725cb9dfbf.jpg
cmurf6c5l0000yd6dt9ur8ke0	cmuhhshwq0002b16dmj4ohr4u	Quran 3	1	t	2026-10-02 20:32:36.873	2026-10-02 20:32:36.873	zalzala - nabaa	/uploads/subjects/6896c824-694e-4d8c-805b-ac891b220540.jpg
cmuhhu1f60003b16dfkcdtcs1	cmuhhs3tw0000b16dt3vyjoxl	dictee	2	t	2026-09-25 21:49:20.178	2026-10-08 19:04:07.713	Van a tot g	/uploads/subjects/49fa4d19-3530-40fe-9b35-4d48ff0c502f.jpg
cmuzwptjp0000666da2gf1e10	cmuhhs3tw0000b16dt3vyjoxl	Nourania	\N	t	2026-10-08 19:05:48.757	2026-10-08 19:05:48.757	les 1 - 4	/uploads/subjects/2edb0866-abdf-4b88-8a63-796e2555f63c.jpg
cmvcbh80j000n01rytqmdn90z	cmuhhs3tw0000b16dt3vyjoxl	التئسيس المتكامل رقم 1	4	t	2026-10-17 11:32:15.955	2026-10-17 11:32:15.955	من حرف ء الى حرف ج	/uploads/subjects/4545be4e-edf4-4fd8-8443-441d8dbebeb3.jpg
\.


--
-- Data for Name: terms; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.terms (id, name, "sortOrder", "createdAt", "updatedAt", "startMonth", "endMonth") FROM stdin;
cmuhjncbq00017g6d3glxc9oh	Termijn 1	1	2026-09-25 22:40:06.95	2026-09-25 22:40:06.95	9	12
cmuhjnzih00027g6dqcn26vnl	Termijn 2	2	2026-09-25 22:40:37.001	2026-09-25 22:40:37.001	1	3
cmuhjotxs00037g6drh9jegfr	Termijn 3	3	2026-09-25 22:41:16.432	2026-09-25 22:41:16.432	4	6
\.


--
-- Data for Name: year_report_observations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.year_report_observations (id, "studentId", "academicYearId", body, "recordedById", "createdAt", "updatedAt") FROM stdin;
cmv01zs8j0000rd6dy8omo97p	cmu7hhica0003wf6douagakq8	cmuhjm5hy00007g6di3jovxng	Heel goed gedaan	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 21:33:31.699	2026-10-08 21:33:31.699
cmv020e230001rd6dk82odixq	cmu7frmin0005bu6d1xbejq4r	cmuhjm5hy00007g6di3jovxng	Kan beter	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 21:33:59.979	2026-10-08 21:33:59.979
cmv020qcz0002rd6dg1ej7chz	cmu7hhicc0004wf6d2j1q5ax0	cmuhjm5hy00007g6di3jovxng	Te vaak te laat, fatiha onvoldoende nog	c724d280-7f41-4b0f-bb24-fc29e1e7f73b	2026-10-08 21:34:15.923	2026-10-08 21:34:15.923
\.


--
-- Name: Account Account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Verification Verification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Verification"
    ADD CONSTRAINT "Verification_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: academic_years academic_years_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_years
    ADD CONSTRAINT academic_years_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: class_comments class_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_comments
    ADD CONSTRAINT class_comments_pkey PRIMARY KEY (id);


--
-- Name: class_session_links class_session_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_session_links
    ADD CONSTRAINT class_session_links_pkey PRIMARY KEY (id);


--
-- Name: class_sessions class_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_sessions
    ADD CONSTRAINT class_sessions_pkey PRIMARY KEY (id);


--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);


--
-- Name: donation_payment_logs donation_payment_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donation_payment_logs
    ADD CONSTRAINT donation_payment_logs_pkey PRIMARY KEY (id);


--
-- Name: donation_payments donation_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donation_payments
    ADD CONSTRAINT donation_payments_pkey PRIMARY KEY (id);


--
-- Name: donation_settings donation_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donation_settings
    ADD CONSTRAINT donation_settings_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);


--
-- Name: exams exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_pkey PRIMARY KEY (id);


--
-- Name: grades grades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_pkey PRIMARY KEY (id);


--
-- Name: guardian_comments guardian_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guardian_comments
    ADD CONSTRAINT guardian_comments_pkey PRIMARY KEY (id);


--
-- Name: guardian_registration_tokens guardian_registration_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guardian_registration_tokens
    ADD CONSTRAINT guardian_registration_tokens_pkey PRIMARY KEY (id);


--
-- Name: guardians guardians_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guardians
    ADD CONSTRAINT guardians_pkey PRIMARY KEY (id);


--
-- Name: levels levels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.levels
    ADD CONSTRAINT levels_pkey PRIMARY KEY (id);


--
-- Name: period_report_observations period_report_observations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.period_report_observations
    ADD CONSTRAINT period_report_observations_pkey PRIMARY KEY (id);


--
-- Name: registration_settings registration_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_settings
    ADD CONSTRAINT registration_settings_pkey PRIMARY KEY (id);


--
-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);


--
-- Name: student_comments student_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_comments
    ADD CONSTRAINT student_comments_pkey PRIMARY KEY (id);


--
-- Name: student_donations student_donations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_donations
    ADD CONSTRAINT student_donations_pkey PRIMARY KEY (id);


--
-- Name: student_guardians student_guardians_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_guardians
    ADD CONSTRAINT student_guardians_pkey PRIMARY KEY (id);


--
-- Name: student_status_events student_status_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_status_events
    ADD CONSTRAINT student_status_events_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: terms terms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terms
    ADD CONSTRAINT terms_pkey PRIMARY KEY (id);


--
-- Name: year_report_observations year_report_observations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.year_report_observations
    ADD CONSTRAINT year_report_observations_pkey PRIMARY KEY (id);


--
-- Name: Account_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Account_userId_idx" ON public."Account" USING btree ("userId");


--
-- Name: Session_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Session_token_key" ON public."Session" USING btree (token);


--
-- Name: Session_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Session_userId_idx" ON public."Session" USING btree ("userId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Verification_identifier_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Verification_identifier_idx" ON public."Verification" USING btree (identifier);


--
-- Name: academic_years_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX academic_years_name_key ON public.academic_years USING btree (name);


--
-- Name: attendance_classId_sessionId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "attendance_classId_sessionId_date_idx" ON public.attendance USING btree ("classId", "sessionId", date);


--
-- Name: attendance_recordedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "attendance_recordedById_idx" ON public.attendance USING btree ("recordedById");


--
-- Name: attendance_studentId_classId_sessionId_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "attendance_studentId_classId_sessionId_date_key" ON public.attendance USING btree ("studentId", "classId", "sessionId", date);


--
-- Name: attendance_studentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "attendance_studentId_idx" ON public.attendance USING btree ("studentId");


--
-- Name: class_comments_authorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "class_comments_authorId_idx" ON public.class_comments USING btree ("authorId");


--
-- Name: class_comments_classId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "class_comments_classId_idx" ON public.class_comments USING btree ("classId");


--
-- Name: class_session_links_classId_sessionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "class_session_links_classId_sessionId_key" ON public.class_session_links USING btree ("classId", "sessionId");


--
-- Name: class_session_links_sessionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "class_session_links_sessionId_idx" ON public.class_session_links USING btree ("sessionId");


--
-- Name: class_sessions_label_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX class_sessions_label_key ON public.class_sessions USING btree (label);


--
-- Name: classes_levelId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "classes_levelId_idx" ON public.classes USING btree ("levelId");


--
-- Name: classes_roomId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "classes_roomId_idx" ON public.classes USING btree ("roomId");


--
-- Name: classes_teacherId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "classes_teacherId_idx" ON public.classes USING btree ("teacherId");


--
-- Name: donation_payment_logs_actorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "donation_payment_logs_actorId_idx" ON public.donation_payment_logs USING btree ("actorId");


--
-- Name: donation_payment_logs_paymentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "donation_payment_logs_paymentId_idx" ON public.donation_payment_logs USING btree ("paymentId");


--
-- Name: donation_payment_logs_studentId_academicYearId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "donation_payment_logs_studentId_academicYearId_idx" ON public.donation_payment_logs USING btree ("studentId", "academicYearId");


--
-- Name: donation_payments_academicYearId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "donation_payments_academicYearId_idx" ON public.donation_payments USING btree ("academicYearId");


--
-- Name: donation_payments_recordedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "donation_payments_recordedById_idx" ON public.donation_payments USING btree ("recordedById");


--
-- Name: donation_payments_studentId_academicYearId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "donation_payments_studentId_academicYearId_idx" ON public.donation_payments USING btree ("studentId", "academicYearId");


--
-- Name: enrollments_classId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "enrollments_classId_idx" ON public.enrollments USING btree ("classId");


--
-- Name: enrollments_studentId_classId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "enrollments_studentId_classId_key" ON public.enrollments USING btree ("studentId", "classId");


--
-- Name: exams_academicYearId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "exams_academicYearId_idx" ON public.exams USING btree ("academicYearId");


--
-- Name: exams_classId_academicYearId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "exams_classId_academicYearId_idx" ON public.exams USING btree ("classId", "academicYearId");


--
-- Name: exams_classId_termId_subjectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "exams_classId_termId_subjectId_idx" ON public.exams USING btree ("classId", "termId", "subjectId");


--
-- Name: exams_recordedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "exams_recordedById_idx" ON public.exams USING btree ("recordedById");


--
-- Name: exams_subjectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "exams_subjectId_idx" ON public.exams USING btree ("subjectId");


--
-- Name: exams_termId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "exams_termId_idx" ON public.exams USING btree ("termId");


--
-- Name: grades_examId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "grades_examId_idx" ON public.grades USING btree ("examId");


--
-- Name: grades_recordedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "grades_recordedById_idx" ON public.grades USING btree ("recordedById");


--
-- Name: grades_studentId_examId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "grades_studentId_examId_key" ON public.grades USING btree ("studentId", "examId");


--
-- Name: grades_studentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "grades_studentId_idx" ON public.grades USING btree ("studentId");


--
-- Name: guardian_comments_authorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "guardian_comments_authorId_idx" ON public.guardian_comments USING btree ("authorId");


--
-- Name: guardian_comments_guardianId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "guardian_comments_guardianId_idx" ON public.guardian_comments USING btree ("guardianId");


--
-- Name: guardian_registration_tokens_guardianId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "guardian_registration_tokens_guardianId_idx" ON public.guardian_registration_tokens USING btree ("guardianId");


--
-- Name: guardian_registration_tokens_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX guardian_registration_tokens_token_key ON public.guardian_registration_tokens USING btree (token);


--
-- Name: guardians_donationNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "guardians_donationNumber_key" ON public.guardians USING btree ("donationNumber");


--
-- Name: guardians_educationNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "guardians_educationNumber_key" ON public.guardians USING btree ("educationNumber");


--
-- Name: guardians_lastName_firstName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "guardians_lastName_firstName_idx" ON public.guardians USING btree ("lastName", "firstName");


--
-- Name: levels_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX levels_name_key ON public.levels USING btree (name);


--
-- Name: period_report_observations_academicYearId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "period_report_observations_academicYearId_idx" ON public.period_report_observations USING btree ("academicYearId");


--
-- Name: period_report_observations_recordedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "period_report_observations_recordedById_idx" ON public.period_report_observations USING btree ("recordedById");


--
-- Name: period_report_observations_studentId_termId_academicYearId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "period_report_observations_studentId_termId_academicYearId_key" ON public.period_report_observations USING btree ("studentId", "termId", "academicYearId");


--
-- Name: period_report_observations_termId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "period_report_observations_termId_idx" ON public.period_report_observations USING btree ("termId");


--
-- Name: rooms_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX rooms_name_key ON public.rooms USING btree (name);


--
-- Name: student_comments_authorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "student_comments_authorId_idx" ON public.student_comments USING btree ("authorId");


--
-- Name: student_comments_studentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "student_comments_studentId_idx" ON public.student_comments USING btree ("studentId");


--
-- Name: student_donations_academicYearId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "student_donations_academicYearId_idx" ON public.student_donations USING btree ("academicYearId");


--
-- Name: student_donations_recordedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "student_donations_recordedById_idx" ON public.student_donations USING btree ("recordedById");


--
-- Name: student_donations_studentId_academicYearId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "student_donations_studentId_academicYearId_key" ON public.student_donations USING btree ("studentId", "academicYearId");


--
-- Name: student_guardians_guardianId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "student_guardians_guardianId_idx" ON public.student_guardians USING btree ("guardianId");


--
-- Name: student_guardians_studentId_guardianId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "student_guardians_studentId_guardianId_key" ON public.student_guardians USING btree ("studentId", "guardianId");


--
-- Name: student_status_events_changedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "student_status_events_changedById_idx" ON public.student_status_events USING btree ("changedById");


--
-- Name: student_status_events_studentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "student_status_events_studentId_idx" ON public.student_status_events USING btree ("studentId");


--
-- Name: students_lastName_firstName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "students_lastName_firstName_idx" ON public.students USING btree ("lastName", "firstName");


--
-- Name: students_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX students_status_idx ON public.students USING btree (status);


--
-- Name: subjects_levelId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "subjects_levelId_idx" ON public.subjects USING btree ("levelId");


--
-- Name: subjects_levelId_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "subjects_levelId_name_key" ON public.subjects USING btree ("levelId", name);


--
-- Name: terms_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX terms_name_key ON public.terms USING btree (name);


--
-- Name: terms_sortOrder_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "terms_sortOrder_key" ON public.terms USING btree ("sortOrder");


--
-- Name: year_report_observations_academicYearId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "year_report_observations_academicYearId_idx" ON public.year_report_observations USING btree ("academicYearId");


--
-- Name: year_report_observations_recordedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "year_report_observations_recordedById_idx" ON public.year_report_observations USING btree ("recordedById");


--
-- Name: year_report_observations_studentId_academicYearId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "year_report_observations_studentId_academicYearId_key" ON public.year_report_observations USING btree ("studentId", "academicYearId");


--
-- Name: Account Account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Session Session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: attendance attendance_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT "attendance_classId_fkey" FOREIGN KEY ("classId") REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: attendance attendance_recordedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT "attendance_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: attendance attendance_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT "attendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public.class_sessions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: attendance attendance_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT "attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: class_comments class_comments_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_comments
    ADD CONSTRAINT "class_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: class_comments class_comments_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_comments
    ADD CONSTRAINT "class_comments_classId_fkey" FOREIGN KEY ("classId") REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: class_session_links class_session_links_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_session_links
    ADD CONSTRAINT "class_session_links_classId_fkey" FOREIGN KEY ("classId") REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: class_session_links class_session_links_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_session_links
    ADD CONSTRAINT "class_session_links_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public.class_sessions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: classes classes_levelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT "classes_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES public.levels(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: classes classes_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT "classes_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public.rooms(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: classes classes_teacherId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT "classes_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: donation_payment_logs donation_payment_logs_academicYearId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donation_payment_logs
    ADD CONSTRAINT "donation_payment_logs_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES public.academic_years(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: donation_payment_logs donation_payment_logs_actorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donation_payment_logs
    ADD CONSTRAINT "donation_payment_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: donation_payment_logs donation_payment_logs_paymentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donation_payment_logs
    ADD CONSTRAINT "donation_payment_logs_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES public.donation_payments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: donation_payment_logs donation_payment_logs_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donation_payment_logs
    ADD CONSTRAINT "donation_payment_logs_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: donation_payments donation_payments_recordedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donation_payments
    ADD CONSTRAINT "donation_payments_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: donation_payments donation_payments_studentId_academicYearId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donation_payments
    ADD CONSTRAINT "donation_payments_studentId_academicYearId_fkey" FOREIGN KEY ("studentId", "academicYearId") REFERENCES public.student_donations("studentId", "academicYearId") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: enrollments enrollments_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT "enrollments_classId_fkey" FOREIGN KEY ("classId") REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: enrollments enrollments_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT "enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: exams exams_academicYearId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT "exams_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES public.academic_years(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: exams exams_classId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT "exams_classId_fkey" FOREIGN KEY ("classId") REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: exams exams_recordedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT "exams_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: exams exams_subjectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT "exams_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES public.subjects(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: exams exams_termId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT "exams_termId_fkey" FOREIGN KEY ("termId") REFERENCES public.terms(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: grades grades_examId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT "grades_examId_fkey" FOREIGN KEY ("examId") REFERENCES public.exams(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: grades grades_recordedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT "grades_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: grades grades_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT "grades_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: guardian_comments guardian_comments_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guardian_comments
    ADD CONSTRAINT "guardian_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: guardian_comments guardian_comments_guardianId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guardian_comments
    ADD CONSTRAINT "guardian_comments_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES public.guardians(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: guardian_registration_tokens guardian_registration_tokens_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guardian_registration_tokens
    ADD CONSTRAINT "guardian_registration_tokens_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: guardian_registration_tokens guardian_registration_tokens_guardianId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guardian_registration_tokens
    ADD CONSTRAINT "guardian_registration_tokens_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES public.guardians(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: period_report_observations period_report_observations_academicYearId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.period_report_observations
    ADD CONSTRAINT "period_report_observations_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES public.academic_years(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: period_report_observations period_report_observations_recordedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.period_report_observations
    ADD CONSTRAINT "period_report_observations_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: period_report_observations period_report_observations_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.period_report_observations
    ADD CONSTRAINT "period_report_observations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: period_report_observations period_report_observations_termId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.period_report_observations
    ADD CONSTRAINT "period_report_observations_termId_fkey" FOREIGN KEY ("termId") REFERENCES public.terms(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: student_comments student_comments_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_comments
    ADD CONSTRAINT "student_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: student_comments student_comments_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_comments
    ADD CONSTRAINT "student_comments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: student_donations student_donations_academicYearId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_donations
    ADD CONSTRAINT "student_donations_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES public.academic_years(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: student_donations student_donations_recordedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_donations
    ADD CONSTRAINT "student_donations_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: student_donations student_donations_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_donations
    ADD CONSTRAINT "student_donations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: student_guardians student_guardians_guardianId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_guardians
    ADD CONSTRAINT "student_guardians_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES public.guardians(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: student_guardians student_guardians_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_guardians
    ADD CONSTRAINT "student_guardians_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: student_status_events student_status_events_changedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_status_events
    ADD CONSTRAINT "student_status_events_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: student_status_events student_status_events_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_status_events
    ADD CONSTRAINT "student_status_events_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: subjects subjects_levelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT "subjects_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES public.levels(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: year_report_observations year_report_observations_academicYearId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.year_report_observations
    ADD CONSTRAINT "year_report_observations_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES public.academic_years(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: year_report_observations year_report_observations_recordedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.year_report_observations
    ADD CONSTRAINT "year_report_observations_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: year_report_observations year_report_observations_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.year_report_observations
    ADD CONSTRAINT "year_report_observations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict jedYKFvkAldDNOdv01kFArP4QxT9jXpZCV3UT4Oc1ZLh8Ja4UcBLEqSstxEy56e


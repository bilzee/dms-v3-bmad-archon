--
-- PostgreSQL database dump
--

\restrict QVO1RvLeJ19wAOciSbNAKMQWjwSLQh4H4LEwN25hlMNW3kNeiSh8a8kZTmbA9gC

-- Dumped from database version 15.14 (Debian 15.14-1.pgdg13+1)
-- Dumped by pg_dump version 15.14 (Debian 15.14-1.pgdg13+1)

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: dms_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO dms_user;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: dms_user
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AssessmentStatus; Type: TYPE; Schema: public; Owner: dms_user
--

CREATE TYPE public."AssessmentStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'VERIFIED',
    'PUBLISHED'
);


ALTER TYPE public."AssessmentStatus" OWNER TO dms_user;

--
-- Name: AssessmentType; Type: TYPE; Schema: public; Owner: dms_user
--

CREATE TYPE public."AssessmentType" AS ENUM (
    'HEALTH',
    'WASH',
    'SHELTER',
    'FOOD',
    'SECURITY',
    'POPULATION'
);


ALTER TYPE public."AssessmentType" OWNER TO dms_user;

--
-- Name: CommitmentStatus; Type: TYPE; Schema: public; Owner: dms_user
--

CREATE TYPE public."CommitmentStatus" AS ENUM (
    'PLANNED',
    'PARTIAL',
    'COMPLETE',
    'CANCELLED'
);


ALTER TYPE public."CommitmentStatus" OWNER TO dms_user;

--
-- Name: DonorType; Type: TYPE; Schema: public; Owner: dms_user
--

CREATE TYPE public."DonorType" AS ENUM (
    'INDIVIDUAL',
    'ORGANIZATION',
    'GOVERNMENT',
    'NGO',
    'CORPORATE'
);


ALTER TYPE public."DonorType" OWNER TO dms_user;

--
-- Name: EntityType; Type: TYPE; Schema: public; Owner: dms_user
--

CREATE TYPE public."EntityType" AS ENUM (
    'COMMUNITY',
    'WARD',
    'LGA',
    'STATE',
    'FACILITY',
    'CAMP'
);


ALTER TYPE public."EntityType" OWNER TO dms_user;

--
-- Name: IncidentStatus; Type: TYPE; Schema: public; Owner: dms_user
--

CREATE TYPE public."IncidentStatus" AS ENUM (
    'ACTIVE',
    'CONTAINED',
    'RESOLVED'
);


ALTER TYPE public."IncidentStatus" OWNER TO dms_user;

--
-- Name: Priority; Type: TYPE; Schema: public; Owner: dms_user
--

CREATE TYPE public."Priority" AS ENUM (
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW'
);


ALTER TYPE public."Priority" OWNER TO dms_user;

--
-- Name: ReportExecutionStatus; Type: TYPE; Schema: public; Owner: dms_user
--

CREATE TYPE public."ReportExecutionStatus" AS ENUM (
    'PENDING',
    'RUNNING',
    'COMPLETED',
    'FAILED'
);


ALTER TYPE public."ReportExecutionStatus" OWNER TO dms_user;

--
-- Name: ReportFormat; Type: TYPE; Schema: public; Owner: dms_user
--

CREATE TYPE public."ReportFormat" AS ENUM (
    'PDF',
    'CSV',
    'HTML',
    'EXCEL'
);


ALTER TYPE public."ReportFormat" OWNER TO dms_user;

--
-- Name: ReportType; Type: TYPE; Schema: public; Owner: dms_user
--

CREATE TYPE public."ReportType" AS ENUM (
    'ASSESSMENT',
    'RESPONSE',
    'ENTITY',
    'DONOR',
    'CUSTOM'
);


ALTER TYPE public."ReportType" OWNER TO dms_user;

--
-- Name: ResponseStatus; Type: TYPE; Schema: public; Owner: dms_user
--

CREATE TYPE public."ResponseStatus" AS ENUM (
    'PLANNED',
    'DELIVERED'
);


ALTER TYPE public."ResponseStatus" OWNER TO dms_user;

--
-- Name: ResponseType; Type: TYPE; Schema: public; Owner: dms_user
--

CREATE TYPE public."ResponseType" AS ENUM (
    'HEALTH',
    'WASH',
    'SHELTER',
    'FOOD',
    'SECURITY',
    'POPULATION',
    'LOGISTICS'
);


ALTER TYPE public."ResponseType" OWNER TO dms_user;

--
-- Name: RoleName; Type: TYPE; Schema: public; Owner: dms_user
--

CREATE TYPE public."RoleName" AS ENUM (
    'ASSESSOR',
    'COORDINATOR',
    'RESPONDER',
    'DONOR',
    'ADMIN'
);


ALTER TYPE public."RoleName" OWNER TO dms_user;

--
-- Name: SyncStatus; Type: TYPE; Schema: public; Owner: dms_user
--

CREATE TYPE public."SyncStatus" AS ENUM (
    'PENDING',
    'SYNCING',
    'SYNCED',
    'FAILED',
    'CONFLICT',
    'LOCAL'
);


ALTER TYPE public."SyncStatus" OWNER TO dms_user;

--
-- Name: VerificationStatus; Type: TYPE; Schema: public; Owner: dms_user
--

CREATE TYPE public."VerificationStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'VERIFIED',
    'AUTO_VERIFIED',
    'REJECTED'
);


ALTER TYPE public."VerificationStatus" OWNER TO dms_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: dms_user
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


ALTER TABLE public._prisma_migrations OWNER TO dms_user;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: dms_user
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    "userId" text,
    action text NOT NULL,
    resource text NOT NULL,
    "resourceId" text,
    "oldValues" jsonb,
    "newValues" jsonb,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ipAddress" text,
    "userAgent" text
);


ALTER TABLE public.audit_logs OWNER TO dms_user;

--
-- Name: donor_commitments; Type: TABLE; Schema: public; Owner: dms_user
--

CREATE TABLE public.donor_commitments (
    id text NOT NULL,
    "donorId" text NOT NULL,
    "entityId" text NOT NULL,
    "incidentId" text NOT NULL,
    status public."CommitmentStatus" DEFAULT 'PLANNED'::public."CommitmentStatus" NOT NULL,
    items jsonb NOT NULL,
    "totalCommittedQuantity" integer DEFAULT 0 NOT NULL,
    "deliveredQuantity" integer DEFAULT 0 NOT NULL,
    "verifiedDeliveredQuantity" integer DEFAULT 0 NOT NULL,
    "commitmentDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastUpdated" timestamp(3) without time zone NOT NULL,
    notes text,
    "totalValueEstimated" double precision DEFAULT 0
);


ALTER TABLE public.donor_commitments OWNER TO dms_user;

--
-- Name: donors; Type: TABLE; Schema: public; Owner: dms_user
--

CREATE TABLE public.donors (
    id text NOT NULL,
    name text NOT NULL,
    type public."DonorType" DEFAULT 'ORGANIZATION'::public."DonorType" NOT NULL,
    "contactEmail" text,
    "contactPhone" text,
    organization text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "leaderboardRank" integer DEFAULT 0,
    "selfReportedDeliveryRate" double precision DEFAULT 0,
    "verifiedDeliveryRate" double precision DEFAULT 0
);


ALTER TABLE public.donors OWNER TO dms_user;

--
-- Name: entities; Type: TABLE; Schema: public; Owner: dms_user
--

CREATE TABLE public.entities (
    id text NOT NULL,
    name text NOT NULL,
    type public."EntityType" NOT NULL,
    location text,
    coordinates jsonb,
    metadata jsonb,
    "isActive" boolean DEFAULT true NOT NULL,
    "autoApproveEnabled" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.entities OWNER TO dms_user;

--
-- Name: entity_assignments; Type: TABLE; Schema: public; Owner: dms_user
--

CREATE TABLE public.entity_assignments (
    id text NOT NULL,
    "userId" text NOT NULL,
    "entityId" text NOT NULL,
    "assignedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "assignedBy" text NOT NULL
);


ALTER TABLE public.entity_assignments OWNER TO dms_user;

--
-- Name: food_assessments; Type: TABLE; Schema: public; Owner: dms_user
--

CREATE TABLE public.food_assessments (
    "rapidAssessmentId" text NOT NULL,
    "isFoodSufficient" boolean NOT NULL,
    "hasRegularMealAccess" boolean NOT NULL,
    "hasInfantNutrition" boolean NOT NULL,
    "foodSource" text DEFAULT '[]'::text NOT NULL,
    "availableFoodDurationDays" integer NOT NULL,
    "additionalFoodRequiredPersons" integer NOT NULL,
    "additionalFoodRequiredHouseholds" integer NOT NULL,
    "additionalFoodDetails" jsonb
);


ALTER TABLE public.food_assessments OWNER TO dms_user;

--
-- Name: health_assessments; Type: TABLE; Schema: public; Owner: dms_user
--

CREATE TABLE public.health_assessments (
    "rapidAssessmentId" text NOT NULL,
    "hasFunctionalClinic" boolean NOT NULL,
    "hasEmergencyServices" boolean NOT NULL,
    "numberHealthFacilities" integer NOT NULL,
    "healthFacilityType" text NOT NULL,
    "qualifiedHealthWorkers" integer NOT NULL,
    "hasTrainedStaff" boolean NOT NULL,
    "hasMedicineSupply" boolean NOT NULL,
    "hasMedicalSupplies" boolean NOT NULL,
    "hasMaternalChildServices" boolean NOT NULL,
    "commonHealthIssues" text DEFAULT '[]'::text NOT NULL,
    "additionalHealthDetails" jsonb
);


ALTER TABLE public.health_assessments OWNER TO dms_user;

--
-- Name: incidents; Type: TABLE; Schema: public; Owner: dms_user
--

CREATE TABLE public.incidents (
    id text NOT NULL,
    type text NOT NULL,
    "subType" text,
    severity public."Priority" DEFAULT 'MEDIUM'::public."Priority" NOT NULL,
    status public."IncidentStatus" DEFAULT 'ACTIVE'::public."IncidentStatus" NOT NULL,
    description text NOT NULL,
    location text NOT NULL,
    coordinates jsonb,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.incidents OWNER TO dms_user;

--
-- Name: media_attachments; Type: TABLE; Schema: public; Owner: dms_user
--

CREATE TABLE public.media_attachments (
    id text NOT NULL,
    "responseId" text NOT NULL,
    filename text NOT NULL,
    "originalName" text NOT NULL,
    "mimeType" text NOT NULL,
    "fileSize" integer NOT NULL,
    "filePath" text NOT NULL,
    "thumbnailPath" text,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "uploadedBy" text NOT NULL
);


ALTER TABLE public.media_attachments OWNER TO dms_user;

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: dms_user
--

CREATE TABLE public.permissions (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.permissions OWNER TO dms_user;

--
-- Name: population_assessments; Type: TABLE; Schema: public; Owner: dms_user
--

CREATE TABLE public.population_assessments (
    "rapidAssessmentId" text NOT NULL,
    "totalHouseholds" integer NOT NULL,
    "totalPopulation" integer NOT NULL,
    "populationMale" integer NOT NULL,
    "populationFemale" integer NOT NULL,
    "populationUnder5" integer NOT NULL,
    "pregnantWomen" integer NOT NULL,
    "lactatingMothers" integer NOT NULL,
    "personWithDisability" integer NOT NULL,
    "elderlyPersons" integer NOT NULL,
    "separatedChildren" integer NOT NULL,
    "numberLivesLost" integer NOT NULL,
    "numberInjured" integer NOT NULL,
    "additionalPopulationDetails" text
);


ALTER TABLE public.population_assessments OWNER TO dms_user;

--
-- Name: preliminary_assessments; Type: TABLE; Schema: public; Owner: dms_user
--

CREATE TABLE public.preliminary_assessments (
    id text NOT NULL,
    "reportingDate" timestamp(3) without time zone NOT NULL,
    "reportingLatitude" double precision NOT NULL,
    "reportingLongitude" double precision NOT NULL,
    "reportingLGA" text NOT NULL,
    "reportingWard" text NOT NULL,
    "numberLivesLost" integer DEFAULT 0 NOT NULL,
    "numberInjured" integer DEFAULT 0 NOT NULL,
    "numberDisplaced" integer DEFAULT 0 NOT NULL,
    "numberHousesAffected" integer DEFAULT 0 NOT NULL,
    "numberSchoolsAffected" integer DEFAULT 0 NOT NULL,
    "schoolsAffected" text,
    "numberMedicalFacilitiesAffected" integer DEFAULT 0 NOT NULL,
    "medicalFacilitiesAffected" text,
    "estimatedAgriculturalLandsAffected" text,
    "reportingAgent" text NOT NULL,
    "additionalDetails" jsonb,
    "incidentId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.preliminary_assessments OWNER TO dms_user;

--
-- Name: rapid_assessments; Type: TABLE; Schema: public; Owner: dms_user
--

CREATE TABLE public.rapid_assessments (
    id text NOT NULL,
    "rapidAssessmentType" public."AssessmentType" NOT NULL,
    "rapidAssessmentDate" timestamp(3) without time zone NOT NULL,
    "assessorId" text NOT NULL,
    "entityId" text NOT NULL,
    "assessorName" text NOT NULL,
    location text,
    coordinates jsonb,
    status public."AssessmentStatus" DEFAULT 'DRAFT'::public."AssessmentStatus" NOT NULL,
    priority public."Priority" DEFAULT 'MEDIUM'::public."Priority" NOT NULL,
    "versionNumber" integer DEFAULT 1 NOT NULL,
    "isOfflineCreated" boolean DEFAULT false NOT NULL,
    "syncStatus" public."SyncStatus" DEFAULT 'PENDING'::public."SyncStatus" NOT NULL,
    "verificationStatus" public."VerificationStatus" DEFAULT 'DRAFT'::public."VerificationStatus" NOT NULL,
    "verifiedAt" timestamp(3) without time zone,
    "verifiedBy" text,
    "rejectionReason" text,
    "rejectionFeedback" text,
    "mediaAttachments" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "gapAnalysis" jsonb,
    "incidentId" text NOT NULL
);


ALTER TABLE public.rapid_assessments OWNER TO dms_user;

--
-- Name: rapid_responses; Type: TABLE; Schema: public; Owner: dms_user
--

CREATE TABLE public.rapid_responses (
    id text NOT NULL,
    "responderId" text NOT NULL,
    "entityId" text NOT NULL,
    "assessmentId" text NOT NULL,
    type public."ResponseType" NOT NULL,
    priority public."Priority" DEFAULT 'MEDIUM'::public."Priority" NOT NULL,
    status public."ResponseStatus" DEFAULT 'PLANNED'::public."ResponseStatus" NOT NULL,
    description text,
    resources jsonb,
    timeline jsonb,
    "versionNumber" integer DEFAULT 1 NOT NULL,
    "isOfflineCreated" boolean DEFAULT false NOT NULL,
    "verificationStatus" public."VerificationStatus" DEFAULT 'DRAFT'::public."VerificationStatus" NOT NULL,
    "verifiedAt" timestamp(3) without time zone,
    "verifiedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "donorId" text,
    "commitmentId" text,
    items jsonb NOT NULL,
    "offlineId" text,
    "plannedDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "rejectionFeedback" text,
    "rejectionReason" text,
    "responseDate" timestamp(3) without time zone,
    "syncStatus" public."SyncStatus" DEFAULT 'LOCAL'::public."SyncStatus" NOT NULL
);


ALTER TABLE public.rapid_responses OWNER TO dms_user;

--
-- Name: report_configurations; Type: TABLE; Schema: public; Owner: dms_user
--

CREATE TABLE public.report_configurations (
    id text NOT NULL,
    "templateId" text NOT NULL,
    name text NOT NULL,
    filters jsonb NOT NULL,
    aggregations jsonb NOT NULL,
    visualizations jsonb NOT NULL,
    schedule jsonb,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.report_configurations OWNER TO dms_user;

--
-- Name: report_executions; Type: TABLE; Schema: public; Owner: dms_user
--

CREATE TABLE public.report_executions (
    id text NOT NULL,
    "configurationId" text NOT NULL,
    status public."ReportExecutionStatus" DEFAULT 'PENDING'::public."ReportExecutionStatus" NOT NULL,
    format public."ReportFormat" NOT NULL,
    "filePath" text,
    "generatedAt" timestamp(3) without time zone,
    error text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.report_executions OWNER TO dms_user;

--
-- Name: report_templates; Type: TABLE; Schema: public; Owner: dms_user
--

CREATE TABLE public.report_templates (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    type public."ReportType" DEFAULT 'CUSTOM'::public."ReportType" NOT NULL,
    layout jsonb NOT NULL,
    "createdById" text NOT NULL,
    "isPublic" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.report_templates OWNER TO dms_user;

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: dms_user
--

CREATE TABLE public.role_permissions (
    id text NOT NULL,
    "roleId" text NOT NULL,
    "permissionId" text NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO dms_user;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: dms_user
--

CREATE TABLE public.roles (
    id text NOT NULL,
    name public."RoleName" NOT NULL,
    description text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.roles OWNER TO dms_user;

--
-- Name: security_assessments; Type: TABLE; Schema: public; Owner: dms_user
--

CREATE TABLE public.security_assessments (
    "rapidAssessmentId" text NOT NULL,
    "isSafeFromViolence" boolean NOT NULL,
    "gbvCasesReported" boolean NOT NULL,
    "hasSecurityPresence" boolean NOT NULL,
    "hasProtectionReportingMechanism" boolean NOT NULL,
    "vulnerableGroupsHaveAccess" boolean NOT NULL,
    "hasLighting" boolean NOT NULL,
    "additionalSecurityDetails" jsonb
);


ALTER TABLE public.security_assessments OWNER TO dms_user;

--
-- Name: shelter_assessments; Type: TABLE; Schema: public; Owner: dms_user
--

CREATE TABLE public.shelter_assessments (
    "rapidAssessmentId" text NOT NULL,
    "areSheltersSufficient" boolean NOT NULL,
    "hasSafeStructures" boolean NOT NULL,
    "shelterTypes" text DEFAULT '[]'::text NOT NULL,
    "requiredShelterType" text DEFAULT '[]'::text NOT NULL,
    "numberSheltersRequired" integer NOT NULL,
    "areOvercrowded" boolean NOT NULL,
    "provideWeatherProtection" boolean NOT NULL,
    "additionalShelterDetails" jsonb
);


ALTER TABLE public.shelter_assessments OWNER TO dms_user;

--
-- Name: sync_conflicts; Type: TABLE; Schema: public; Owner: dms_user
--

CREATE TABLE public.sync_conflicts (
    id text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    "conflictDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "resolutionMethod" text DEFAULT 'LAST_WRITE_WINS'::text NOT NULL,
    "winningVersion" jsonb NOT NULL,
    "losingVersion" jsonb NOT NULL,
    "resolvedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "coordinatorNotified" boolean DEFAULT false NOT NULL,
    "coordinatorNotifiedAt" timestamp(3) without time zone,
    "responseId" text
);


ALTER TABLE public.sync_conflicts OWNER TO dms_user;

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: dms_user
--

CREATE TABLE public.user_roles (
    id text NOT NULL,
    "userId" text NOT NULL,
    "roleId" text NOT NULL,
    "assignedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "assignedBy" text NOT NULL
);


ALTER TABLE public.user_roles OWNER TO dms_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: dms_user
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    username text NOT NULL,
    "passwordHash" text NOT NULL,
    name text NOT NULL,
    phone text,
    organization text,
    "isActive" boolean DEFAULT true NOT NULL,
    "isLocked" boolean DEFAULT false NOT NULL,
    "lastLogin" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.users OWNER TO dms_user;

--
-- Name: wash_assessments; Type: TABLE; Schema: public; Owner: dms_user
--

CREATE TABLE public.wash_assessments (
    "rapidAssessmentId" text NOT NULL,
    "waterSource" text DEFAULT '[]'::text NOT NULL,
    "isWaterSufficient" boolean NOT NULL,
    "hasCleanWaterAccess" boolean NOT NULL,
    "functionalLatrinesAvailable" integer NOT NULL,
    "areLatrinesSufficient" boolean NOT NULL,
    "hasHandwashingFacilities" boolean NOT NULL,
    "hasOpenDefecationConcerns" boolean NOT NULL,
    "additionalWashDetails" jsonb
);


ALTER TABLE public.wash_assessments OWNER TO dms_user;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: dms_user
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
dda5ff71-cda3-419d-a513-c519eeaef0c7	e0b8b3de308c1b1f094acdef9751912cff15f1f0bcef110610549ca85a51ca3a	2025-11-28 12:02:37.308656+00	001_init_database_schema	\N	\N	2025-11-28 12:02:36.791158+00	1
c65018c2-0107-40d0-8aff-3264de89ecfb	82ba61a553cccac3d4e143db431fe2387cecad36391d977170fa45052512940f	2025-11-28 12:02:37.326732+00	20251113213445_add_gamification_fields	\N	\N	2025-11-28 12:02:37.31265+00	1
cd5f6c32-336b-40e7-8097-ac330cdae633	a49c753879ab7b640b64631dc39b6ebe52da7d80508392063766ff7b035f261a	2025-11-28 12:02:37.342634+00	20251125201327_add_gap_analysis_field	\N	\N	2025-11-28 12:02:37.330648+00	1
ed290c64-1a1f-4b7c-948a-162504419782	8bec5b631190c851821fe3bd1f73fac88bd34887e714ca384271496aeb8b9093	2025-11-28 12:02:46.009813+00	20251128120245_add_temporary_password_support	\N	\N	2025-11-28 12:02:45.946248+00	1
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: dms_user
--

COPY public.audit_logs (id, "userId", action, resource, "resourceId", "oldValues", "newValues", "timestamp", "ipAddress", "userAgent") FROM stdin;
d0458cbf-f147-4406-84a6-538a6d89cc84	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81	LIST_USERS	USER_MANAGEMENT	\N	\N	{"query": {"page": 1, "role": null, "limit": 20, "search": null, "status": null}, "resultsCount": 7}	2025-11-28 12:18:41.125	unknown	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
9b2675e8-dd91-4512-989b-de6cfe511baa	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81	LIST_USERS	USER_MANAGEMENT	\N	\N	{"query": {"page": 1, "role": null, "limit": 20, "search": null, "status": null}, "resultsCount": 7}	2025-11-28 12:18:41.159	unknown	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
fb158d67-fbfa-486c-a183-63cf54a57d0b	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81	CREATE_USER	User	06e7234e-f469-40bf-a91e-86942c47c203	\N	{"name": "Ad Co", "email": "adco@email.com", "roles": ["d231c87b-7013-4216-9c2f-ac7604a8d938", "126c2400-3ee2-4086-ae76-196967618454"], "username": "adco"}	2025-11-28 12:21:25.037	\N	\N
43d393e7-9d14-4efe-89d0-74edcde53c58	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81	LIST_USERS	USER_MANAGEMENT	\N	\N	{"query": {"page": 1, "role": null, "limit": 20, "search": null, "status": null}, "resultsCount": 8}	2025-11-28 12:21:25.221	unknown	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
d6aeda96-18e6-4b43-b7a8-177570a04993	06e7234e-f469-40bf-a91e-86942c47c203	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-28 12:21:58.956	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
669a91ed-1df9-43ec-9d3b-dd91a7cfc687	06e7234e-f469-40bf-a91e-86942c47c203	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-28 12:21:58.988	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
9925ee2a-3f45-4814-abbc-b1d50310b9dd	06e7234e-f469-40bf-a91e-86942c47c203	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-28 12:21:58.996	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
ee51d69b-5587-46c0-98ec-40031d936917	06e7234e-f469-40bf-a91e-86942c47c203	LIST_USERS	USER_MANAGEMENT	\N	\N	{"query": {"page": 1, "role": null, "limit": 20, "search": null, "status": null}, "resultsCount": 8}	2025-11-28 12:22:26.933	unknown	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
9d23caca-bd5c-4c30-813d-6ef962688671	06e7234e-f469-40bf-a91e-86942c47c203	LIST_USERS	USER_MANAGEMENT	\N	\N	{"query": {"page": 1, "role": null, "limit": 20, "search": null, "status": null}, "resultsCount": 8}	2025-11-28 12:22:26.992	unknown	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
67e9129a-77c6-4c3f-a08c-54a944794a45	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81	LIST_USERS	USER_MANAGEMENT	\N	\N	{"query": {"page": 1, "role": null, "limit": 20, "search": null, "status": null}, "resultsCount": 8}	2025-11-28 12:32:15.467	unknown	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
aabeeda2-6223-400b-b5b8-ef62d14039cf	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81	LIST_USERS	USER_MANAGEMENT	\N	\N	{"query": {"page": 1, "role": null, "limit": 20, "search": null, "status": null}, "resultsCount": 8}	2025-11-28 12:32:15.515	unknown	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
8be41c7b-bc63-45c4-a996-2e343c79c129	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81	LIST_USERS	USER_MANAGEMENT	\N	\N	{"query": {"page": 1, "role": null, "limit": 20, "search": null, "status": null}, "resultsCount": 8}	2025-11-28 12:46:46.911	unknown	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
1efc5e35-274c-48da-95ff-e778b9ad6916	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81	LIST_USERS	USER_MANAGEMENT	\N	\N	{"query": {"page": 1, "role": null, "limit": 20, "search": null, "status": null}, "resultsCount": 8}	2025-11-28 12:46:46.95	unknown	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
988760cd-08d0-47b9-b6a8-4c0551fc5e2d	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81	LIST_USERS	USER_MANAGEMENT	\N	\N	{"query": {"page": 1, "role": null, "limit": 20, "search": null, "status": null}, "resultsCount": 8}	2025-11-28 12:50:35.607	unknown	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
0a940a40-60aa-4eff-a418-fa06c46428c8	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81	LIST_USERS	USER_MANAGEMENT	\N	\N	{"query": {"page": 1, "role": null, "limit": 20, "search": null, "status": null}, "resultsCount": 8}	2025-11-28 12:50:40.691	unknown	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
3c434ef9-882e-498e-8cd6-5ab961a757b8	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81	CREATE_USER	User	ad711d3f-7e86-48a1-aa64-536d08be41aa	\N	{"name": "As Re", "email": "asre@email.com", "roles": ["765e6da8-b05c-4705-a718-c8fb1b86336d", "05930b44-6a40-48e8-a95e-c421da917a74"], "username": "asre"}	2025-11-28 22:43:14.143	\N	\N
05518d54-9610-4500-99dc-3620d2a62113	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 18:01:47.142	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
1522d8ba-b77e-4b1d-a7da-6c2431d4c0ee	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:01:47.148	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
dc9f54c4-8ab5-45da-9838-45988ab09b83	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:01:47.155	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
5d435d0e-e6c2-4630-a912-b13b78519f00	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:02:17.21	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
bda0925d-a786-4d52-b4ec-1f31e133f5fc	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:02:17.25	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
7cf5205b-f50d-457e-b10e-d443618ca0da	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 18:02:53.607	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
21fbd1c9-a724-4d76-bf61-d9de8bac1e00	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:02:59.01	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
b693a106-3661-4a46-88dd-da33cf0e979b	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 18:02:59.011	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
ea0e1806-b4c4-403c-b6a0-0338cac22a27	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:02:59.022	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
6905399d-93de-4f70-8802-e8d561d1c2ef	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:03:04.767	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
3f85d851-94c4-4776-a75b-e78f182a50ff	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:03:04.738	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
6b31cd84-c447-4a84-9208-c34de95df025	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 18:03:04.767	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
d74287da-a0c3-414c-936a-8f31b702fd4b	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 18:13:33.369	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
f05ed080-4b2d-4f00-88ac-6d30095bc3dd	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:13:33.374	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
de965381-60fd-48e5-996a-f00733da8463	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:13:33.383	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
037feb97-22ed-4cba-94cd-b11ee9df5d7b	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:14:03.498	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
4934adda-41e0-4df1-ba3b-aa8f7171c457	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:14:03.518	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
22167798-f7c8-4147-b91c-456cbe0cc139	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 18:14:33.684	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
fca59d7d-b5b9-4044-8b31-cd8efd8665d4	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:14:33.751	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
306d8382-246d-45d1-a6c6-acfe3f670fe8	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:14:33.755	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
cc22340f-172b-4a60-9071-af6c969458e4	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:15:03.824	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
7636b631-4604-4505-8b52-022219bc07d9	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:15:03.831	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
c85229cb-0afb-4972-9950-4bebdb429f0a	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 18:15:33.753	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
cd9d7554-ee40-4156-8e28-c0d433b0838a	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:15:33.901	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
c0c1857d-ba93-4d0d-9f4a-bd93478c4d36	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:15:33.904	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
402b0288-f0cf-449b-8f6f-2f655e204aaf	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:16:03.98	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
14e0bfc9-c8ae-435f-a60a-44a8089a2b80	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:16:03.982	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
f25f7970-71ef-43a4-8458-e6fa4336384c	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:16:24.467	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
d1b036e6-a038-4b7e-8a1c-5ba5611bae3f	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 18:16:24.468	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
3af7c585-6a98-4f0b-8ae6-21bcdfe727b0	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:16:24.478	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
3f218951-e4bb-46a0-88dc-870e47e964ca	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:17:24.641	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
3dbc587a-0609-4ad2-b730-c52eaf744311	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:16:54.567	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
809546cb-3298-4a35-968c-8d20058858c1	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:16:54.57	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
33915f25-24bc-46bd-b1a2-040c265bda3f	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 18:17:24.569	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
546faee9-9d8f-4421-b291-ebc6d874d98d	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:17:24.626	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
d73452b2-82b4-42b4-8c97-7682f81edac6	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:17:54.703	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
2f0dcbf8-1cb0-43d3-affc-f1f410155f43	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:17:54.715	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
407d04c8-f823-4d0e-bcd9-f492e81a0a18	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 18:18:24.646	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
56c07f27-563b-4f08-8faa-930967bc74dd	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:18:24.776	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
3d4714c6-9560-440d-a83d-c3bb7805d9d5	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:18:24.787	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
c06c2932-5fbe-456d-80f9-8f1e37ba1479	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:18:54.897	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
295e320a-39b6-42bf-abfc-6ce2004e333b	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:18:54.9	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
84b999cb-a4df-40f4-a7e5-4715cedfb974	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 18:19:24.722	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
63d85c66-ddd8-499e-bdfc-3e6da1bb12d5	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:19:24.996	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
aaafb44d-714e-4997-94b8-0c6a3b8581e7	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:19:25.004	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
3d4ce42e-00fd-45e2-9b97-94c1eac3a55e	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:19:55.088	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
2104710b-6322-4010-8c64-fe35b6cff58b	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:19:55.094	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
dc6948f8-eca9-4feb-b8ef-90b2f5877b80	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 18:20:24.785	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
542f21df-83b6-4f24-822e-68dd6a525d24	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:20:25.164	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
7689dcbf-0d1c-49e9-9e49-328f4d656f36	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:20:25.171	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
f110e003-68b9-4468-a10e-19e22fbabd2d	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:20:55.237	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
a280b842-c6e0-4c3c-ac4b-0a031243ad54	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:20:55.253	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
150d1622-5675-4f4c-a2d0-9f60b5cc72d8	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 18:21:24.838	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
3dc7090e-2d69-4d77-a427-c03d834f1773	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:21:25.319	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
efa8ca1e-3828-4f06-9f71-3cd37fa2c446	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:22:52.803	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
9411878e-704b-4e9e-a260-d44000a78374	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 18:22:52.832	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
a13e926e-4b00-4a81-bbcd-7a8e8beab4c0	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:22:52.838	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
6728a49f-0f84-4094-9780-04996b8587a2	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:23:26.498	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
047a044b-e8c2-4cbe-8a76-76b75186d3b0	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:21:25.321	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
b9269363-34d0-40b0-b951-58673726f634	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:22:25.487	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
8a6d36a2-f79b-4843-b3d3-8ea304dfea7c	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:21:55.407	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
189e3e43-dd60-4dcc-b437-63a838f4c473	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:23:26.493	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
0842a48c-57b8-4b94-9cde-d1ba9213cdca	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 18:23:56.484	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
35ee46db-4487-41f8-8062-7b375661b930	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:23:56.578	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
273124b6-0870-4262-82e0-0d1cecda3455	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:25:56.904	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
8e7fa823-acb0-4632-bcab-cc1aacc990b5	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 22:15:03.64	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
804f5173-22e0-4604-88cf-a5e31103bd9f	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:23:56.581	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
2fecebd8-cbfe-44fe-a085-def7380cd2a3	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:24:26.662	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
dc0c6d46-bfe1-4020-99b0-a1bd64fb3ae3	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 18:24:56.571	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
bba644a0-1414-45e7-b6a2-6abe4335d78f	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:24:56.734	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
a63ecb1a-5d98-4453-8557-a13e01ca11cc	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:25:26.823	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
d7dcaa27-dab8-4b4b-8014-5ce0b2208287	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 18:25:56.657	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
3165bbd2-99b2-4ab3-9aaa-3bc9f7c786a9	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 22:15:03.643	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
726e1f7e-17c0-4044-a305-4e2106d9bd21	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:24:26.655	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
128ca5c9-26f6-4f3e-8a4b-5e540382dde8	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 22:19:14.109	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
0bfa851e-1afc-463d-b13a-88580f611d7b	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 22:21:14.558	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
3f1ee14f-b7d9-497b-b174-05469660c85d	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 22:21:44.654	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
7da7c650-cbcd-404b-9a18-94de6b2e5476	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:24:56.742	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
8900bf56-75e1-40c2-8838-7008ad146544	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:25:56.908	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
2f2bbfb1-3463-4ddd-bd66-622e6c387c0a	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 22:19:14.109	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
7146f499-91e0-4d52-ab32-8ea015d03b89	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 22:19:44.243	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
1ac3fb2d-67c5-405a-8ce7-c96d3eb13850	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 22:20:14.299	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
d45deb9a-4d83-424e-a4e4-687ec5775307	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:25:26.814	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
c5471a8a-e61d-4ebd-8c82-d9dc8b43cfce	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 22:19:14.123	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
9c86a502-3abf-45ca-bfb7-5f6233428c06	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 22:20:44.484	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
3f3fe619-8c5a-4df3-9cbe-9eed4f895e57	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 22:21:14.396	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
a73d78f4-d4e0-403d-aa91-988d72fe28fc	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 22:21:44.666	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
9bb036ec-6e1a-4f2e-8287-1fca22819335	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 22:22:14.476	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
ddf2ab63-7d2f-4c07-bf94-0517217f1db4	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 22:22:14.754	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
2ae79a3c-8819-482b-943a-afc6162f9296	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 22:23:14.961	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
70d10ef7-8f92-401c-b985-1fdd4db75e25	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:26:23.986	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
8e346cbe-c97a-430a-bcb4-85beb19e372f	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 22:19:44.24	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
be6875b6-ef3e-48db-8aba-a7559da5e970	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 22:22:44.862	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
f7ac547f-4ba7-42d0-afb9-5a7d9b8d38ff	1757655f-eeb3-471d-9cab-21835cb6692f	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-12-02 11:25:02.659	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 OPR/124.0.0.0
b9fda87d-7ea6-4e79-9585-95a34f026fb4	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 18:26:24.01	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
6267bff3-02de-427b-bb07-757d8f943288	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:27:24.161	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
040d922f-8ba9-42b6-bed0-f4746e0cfbb9	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:27:24.173	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
a7c98fef-46a2-4a67-b5f1-3fcfe37b9284	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 22:20:14.368	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
370c7b60-a381-437b-b2e4-8ec2c91a35ed	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 22:20:44.468	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
ef1e1d19-b57e-492a-b0b4-3bffe40decb3	1757655f-eeb3-471d-9cab-21835cb6692f	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-12-02 11:25:02.673	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 OPR/124.0.0.0
e4d38994-5737-4bce-bc63-dec00496e539	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:26:24.016	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
79ab54bc-3bd6-47ae-84cb-56aa06aec8a4	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:27:54.246	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
40901534-9466-485f-83a5-6678bead0f8d	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 22:20:14.376	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
22dc39a0-6440-40b5-a3e9-ee99e8ee7944	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 22:21:14.571	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
99fe546f-a94a-47b9-b8ea-fa13fe9d7793	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 22:22:14.751	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
a441e44f-bdb7-4f46-a498-c4ae15398a19	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 22:22:44.869	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
24d42b90-4e5f-4ddb-b781-ea6d02de2195	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 22:23:14.6	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
7a4f51ab-8be4-4539-a111-37d9199611de	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 22:23:14.961	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
739de0f7-fb4c-4c86-8682-ae56ee45b74d	1757655f-eeb3-471d-9cab-21835cb6692f	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-12-02 11:25:02.686	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 OPR/124.0.0.0
91f1ad31-a3cb-4443-a73a-168f24358051	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:26:54.072	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
d5a1d7fb-c61a-453e-abc0-102d0eeb9d0d	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:26:54.105	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
bc14ef4b-282d-4b74-be9b-28583f0db11f	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 18:27:24.099	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
ffcd83a5-42e0-4c46-80fc-c44449803d14	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:27:54.259	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
7e98f693-4c67-4378-8cb4-7d23b17faa66	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 22:23:45.105	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
f0b351b4-4da4-4a20-b04d-323564d99c33	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-12-02 11:29:39.017	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 OPR/124.0.0.0
f0e2add3-fdbd-49bc-b17b-6572ec261019	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 19:07:59.831	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
eaf65d51-3be5-44a7-98af-fbaff066cd22	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 22:23:45.112	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
03a06163-6781-4bfb-935b-4b2db657df50	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 22:24:14.71	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
75bf9ff0-82d1-48e0-bf5a-adf880c2f4e1	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 22:24:15.194	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
2e065db9-1719-4be1-aa8b-683f8c0888a7	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-12-02 11:29:39.026	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 OPR/124.0.0.0
ba9c3b68-bed4-49d9-89dd-7826781edf39	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-12-02 11:29:39.035	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 OPR/124.0.0.0
13dd8652-a695-4e8a-b789-b729e7a84a8c	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 19:07:59.832	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
e87359c1-d588-4f37-9eab-5c740305cc1b	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 22:24:15.199	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
7d61ca5a-0b2d-4275-8382-406e6f4627bf	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-12-02 11:30:18.163	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 OPR/124.0.0.0
fc352c42-7573-40d5-b8d3-7463f8bcca44	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 19:07:59.845	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
574588ae-19af-4018-94df-80b7b4568adb	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-30 13:01:18.125	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
5a3c4c96-ed67-40e5-9b35-9eb2e6bd2d21	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-30 13:01:18.144	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
a397810a-ec66-498e-b707-8599c3119ce6	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-12-02 11:30:18.167	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 OPR/124.0.0.0
343653de-d731-432d-90a8-3ccb291b15cf	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 22:00:35.962	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
11cf8222-0050-4acb-8ac4-c7c2e7d52b9d	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-30 13:01:18.131	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
7ca3a053-a850-4e20-bb84-def511368354	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-12-02 11:30:18.179	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 OPR/124.0.0.0
c68f1819-67f8-47ec-b674-2e529906db11	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 22:00:35.977	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
3988e48c-e73c-40e0-abc6-9679230722d1	1757655f-eeb3-471d-9cab-21835cb6692f	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-30 22:37:26.48	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
5a44fbf2-153a-4d8b-a4b9-a8e8049a48d1	\N	ASSESSMENT_VERIFIED	RapidAssessment	2c4bcc0f-ddc1-4f44-8471-a715ef0cfdd0	\N	{"entityName": "Maiduguri Metropolitan", "assessmentType": "POPULATION"}	2025-12-02 11:33:47.56	\N	\N
adef521a-9b57-4c95-b5f0-c7d66a648f92	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 22:00:35.979	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
d97f2c11-1161-40ae-bad1-7d5967b01552	1757655f-eeb3-471d-9cab-21835cb6692f	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-30 22:37:26.489	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
98a15e2f-bb4a-4807-80cc-e55896ce6f0a	\N	ASSESSMENT_VERIFIED	RapidAssessment	570dcd7e-0215-41d0-b4e6-48f736b31318	\N	{"entityName": "Gwoza Local Government", "assessmentType": "POPULATION"}	2025-12-02 11:33:51.785	\N	\N
1df56e53-44cb-41d0-aa8b-341321af0a0c	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 22:12:05.617	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
0708b414-e1d1-4b11-ab0b-9cb473b6b174	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 22:12:05.628	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
2aa9bc0a-5f8d-492c-81af-4ae485bd5338	1757655f-eeb3-471d-9cab-21835cb6692f	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-30 22:37:26.516	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
067e5170-f789-43aa-a2db-e5c0412677f6	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 22:12:05.63	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
d7f1b4e6-263f-4273-8792-e83b2857dc4e	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 22:13:33.368	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
56887f5b-804e-4938-8d4f-02d3c3eb2a91	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 22:13:33.374	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
ac593a8c-0b7b-44cc-9868-341940830008	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 22:14:03.35	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
055f3ee1-a634-4315-9b7c-2661a7c786a5	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 22:14:33.564	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
6ac772be-7e60-4857-a8c4-c1a847a33052	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 22:15:03.443	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
771a6756-50e3-4dc8-982a-95cda38c83c4	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 22:15:33.743	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
f23c2149-f465-448e-9cd0-0fd7ee233fe5	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 22:14:03.449	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
fd182d8f-aac5-4c5c-a70b-3b4f1cb37553	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 22:14:03.453	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
bbf71235-a834-42fb-b868-f359b96ebcc2	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 22:16:03.829	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
b95fe86a-12d2-4e8d-8634-26cee5570c77	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 22:16:03.834	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
abda2a1e-8f42-4ec9-8290-aee9f24993ca	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 22:14:33.558	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
e0ea679e-72c4-4edb-a1d3-7679ec56523f	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 22:15:33.75	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
6c899e34-0359-48ae-8967-b3155bdbca5b	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 22:16:03.538	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
6dd6cd6f-b3df-4623-b4e2-7fb9ec209a7a	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_STATS	RESOURCE_MANAGEMENT_STATS	\N	null	{"filters": {"status": null, "donorId": null, "entityId": null, "incidentId": null}}	2025-11-29 18:21:55.408	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
5991c5e1-6797-4018-88dc-2cc90a927638	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_CRITICAL_GAPS	CRITICAL_GAPS	\N	null	{"criticalGapsFound": 2}	2025-11-29 18:22:24.907	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
196acde2-ec63-40eb-8cb3-7879ba58df91	60173e37-d242-4e05-b808-64cad3a61297	ACCESS_RESOURCE_MANAGEMENT_COMMITMENTS	RESOURCE_MANAGEMENT_COMMITMENTS	\N	null	{"filters": {"search": null, "status": null, "donorId": null, "entityId": null, "incidentId": null}, "pagination": {"page": 1, "limit": 50, "total": 4}}	2025-11-29 18:22:25.485	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
\.


--
-- Data for Name: donor_commitments; Type: TABLE DATA; Schema: public; Owner: dms_user
--

COPY public.donor_commitments (id, "donorId", "entityId", "incidentId", status, items, "totalCommittedQuantity", "deliveredQuantity", "verifiedDeliveredQuantity", "commitmentDate", "lastUpdated", notes, "totalValueEstimated") FROM stdin;
commitment-flood-001	donor-un-001	entity-1	incident-flood-001	PLANNED	[{"name": "Emergency Food Rations", "unit": "packages", "quantity": 500}, {"name": "Clean Water Containers", "unit": "jerrycans", "quantity": 1000}, {"name": "Emergency Shelter Kits", "unit": "kits", "quantity": 200}, {"name": "Medical Supplies", "unit": "boxes", "quantity": 50}]	1750	0	0	2025-11-28 12:03:34.307	2025-11-28 12:03:34.307	Emergency response package for flood-affected families in Maiduguri	0
commitment-flood-002	donor-care-001	entity-1	incident-flood-001	PLANNED	[{"name": "Hygiene Kits", "unit": "kits", "quantity": 300}, {"name": "Blankets", "unit": "pieces", "quantity": 800}, {"name": "Cooking Utensils Set", "unit": "sets", "quantity": 250}]	1350	0	0	2025-11-28 12:03:34.316	2025-11-28 12:03:34.316	Essential household items for displaced families	0
commitment-drought-001	donor-un-001	entity-3	incident-drought-001	PLANNED	[{"name": "Drought-Resistant Seeds", "unit": "kg", "quantity": 2000}, {"name": "Irrigation Equipment", "unit": "sets", "quantity": 100}, {"name": "Water Storage Tanks", "unit": "pieces", "quantity": 25}]	2125	0	0	2025-11-28 12:03:34.325	2025-11-28 12:03:34.325	Agricultural support for drought-affected farmers in Gwoza	0
commitment-partial-001	donor-care-001	entity-1	incident-flood-001	PARTIAL	[{"name": "Mosquito Nets", "unit": "pieces", "quantity": 600}, {"name": "Water Purification Tablets", "unit": "boxes", "quantity": 100}]	700	350	300	2025-11-28 12:03:34.332	2025-11-28 12:03:34.332	Health protection items - partially delivered	0
\.


--
-- Data for Name: donors; Type: TABLE DATA; Schema: public; Owner: dms_user
--

COPY public.donors (id, name, type, "contactEmail", "contactPhone", organization, "isActive", "createdAt", "updatedAt", "leaderboardRank", "selfReportedDeliveryRate", "verifiedDeliveryRate") FROM stdin;
donor-test-001	Test Donor Organization	ORGANIZATION	donor@test.com	+234-800-000-0000	Test Donor Organization	t	2025-11-28 12:03:34.21	2025-11-28 12:03:34.21	0	0	0
donor-multirole-001	Borno State Emergency Management Agency	ORGANIZATION	multirole@dms.gov.ng	+234-800-555-0000	Borno State Emergency Management Agency	t	2025-11-28 12:03:34.218	2025-11-28 12:03:34.218	0	0	0
donor-care-001	CARE International Nigeria	ORGANIZATION	nigeria@careinternational.org	+234-9-290-3000	CARE International	t	2025-11-28 12:03:34.301	2025-12-02 12:53:52.057	1	17.07317073170732	14.63414634146341
donor-un-001	United Nations Office for the Coordination of Humanitarian Affairs	ORGANIZATION	ocha.nigeria@un.org	+234-9-461-4000	UN OCHA	t	2025-11-28 12:03:34.294	2025-12-02 12:53:52.057	2	0	0
\.


--
-- Data for Name: entities; Type: TABLE DATA; Schema: public; Owner: dms_user
--

COPY public.entities (id, name, type, location, coordinates, metadata, "isActive", "autoApproveEnabled", "createdAt", "updatedAt") FROM stdin;
entity-1	Maiduguri Metropolitan	LGA	Borno State	{"lat": 11.8311, "lng": 13.1511}	\N	t	f	2025-11-28 12:03:33.645	2025-11-28 12:03:33.645
entity-2	Jere Local Government	LGA	Borno State	{"lat": 11.8822, "lng": 13.2143}	\N	t	f	2025-11-28 12:03:33.65	2025-11-28 12:03:33.65
entity-3	Gwoza Local Government	LGA	Borno State	{"lat": 11.0417, "lng": 13.6875}	\N	t	f	2025-11-28 12:03:33.654	2025-11-28 12:03:33.654
entity-4	Primary Health Center Maiduguri	FACILITY	Maiduguri	{"lat": 11.8467, "lng": 13.1569}	\N	t	f	2025-11-28 12:03:33.658	2025-11-28 12:03:33.658
entity-5	IDP Camp Dalori	CAMP	Maiduguri	{"lat": 11.7833, "lng": 13.2167}	\N	t	f	2025-11-28 12:03:33.662	2025-11-28 12:03:33.662
\.


--
-- Data for Name: entity_assignments; Type: TABLE DATA; Schema: public; Owner: dms_user
--

COPY public.entity_assignments (id, "userId", "entityId", "assignedAt", "assignedBy") FROM stdin;
a61452fe-60b6-4266-9d1a-c396b9fed5ee	1757655f-eeb3-471d-9cab-21835cb6692f	entity-1	2025-11-28 12:03:33.827	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81
3d329f86-37f6-43f4-9b5d-ca498092bd62	60173e37-d242-4e05-b808-64cad3a61297	entity-1	2025-11-28 12:03:33.926	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81
f5e8a6bb-2fbc-4c2e-9c79-b570f1eb687e	e29a35ac-8c66-424d-a188-b6b97af91e6d	entity-1	2025-11-28 12:03:34.008	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81
14281ef1-689f-4ae3-8bb9-bf2f25a5b9a6	2b903a08-c10c-430c-af70-e489dc65b2fc	entity-1	2025-11-28 12:03:34.087	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81
0bdc7a83-a226-431f-894d-a1bcda61d872	60173e37-d242-4e05-b808-64cad3a61297	entity-3	2025-11-28 12:03:34.094	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81
96122501-860d-4d18-a51f-1f5d09ef1199	e29a35ac-8c66-424d-a188-b6b97af91e6d	entity-3	2025-11-28 12:03:34.103	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81
ad531664-0523-4b87-b985-23fc460f6104	2b903a08-c10c-430c-af70-e489dc65b2fc	entity-3	2025-11-28 12:03:34.11	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81
201beb70-e0ba-43ff-bc37-fb11c728a778	60173e37-d242-4e05-b808-64cad3a61297	entity-2	2025-11-28 12:03:34.117	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81
f41a349d-31c6-445e-ac1a-aff983d9a068	60173e37-d242-4e05-b808-64cad3a61297	entity-4	2025-11-28 12:03:34.124	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81
f0d7af83-fba8-41cf-a192-2b8c94b9b329	bb78b6e6-d7d8-43c9-a3b7-9b1bac8d04d4	entity-1	2025-11-28 12:03:34.204	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81
\.


--
-- Data for Name: food_assessments; Type: TABLE DATA; Schema: public; Owner: dms_user
--

COPY public.food_assessments ("rapidAssessmentId", "isFoodSufficient", "hasRegularMealAccess", "hasInfantNutrition", "foodSource", "availableFoodDurationDays", "additionalFoodRequiredPersons", "additionalFoodRequiredHouseholds", "additionalFoodDetails") FROM stdin;
6470db6e-2103-474f-9bcf-acf52391d40e	f	t	t	["Market","Food aid","Local farming"]	22	76	10	\N
\.


--
-- Data for Name: health_assessments; Type: TABLE DATA; Schema: public; Owner: dms_user
--

COPY public.health_assessments ("rapidAssessmentId", "hasFunctionalClinic", "hasEmergencyServices", "numberHealthFacilities", "healthFacilityType", "qualifiedHealthWorkers", "hasTrainedStaff", "hasMedicineSupply", "hasMedicalSupplies", "hasMaternalChildServices", "commonHealthIssues", "additionalHealthDetails") FROM stdin;
c022bcbe-d0db-49f1-a605-7d3e44f24038	t	f	1	Primary Health Center	6	t	t	t	f	["Malaria","Diarrhea","Respiratory infections"]	\N
\.


--
-- Data for Name: incidents; Type: TABLE DATA; Schema: public; Owner: dms_user
--

COPY public.incidents (id, type, "subType", severity, status, description, location, coordinates, "createdBy", "createdAt", "updatedAt") FROM stdin;
incident-flood-001	FLOOD	SEASONAL_FLOODING	HIGH	ACTIVE	Severe flooding in Maiduguri metropolitan area affecting multiple neighborhoods	Maiduguri Metropolitan Area, Borno State	{"latitude": 11.8311, "longitude": 13.1566}	1757655f-eeb3-471d-9cab-21835cb6692f	2025-11-28 12:03:34.224	2025-11-28 12:03:34.224
incident-drought-001	DROUGHT	AGRICULTURAL_DROUGHT	MEDIUM	ACTIVE	Agricultural drought affecting crop production in Gwoza area	Gwoza Local Government Area, Borno State	{"latitude": 11.0544, "longitude": 13.7839}	1757655f-eeb3-471d-9cab-21835cb6692f	2025-11-28 12:03:34.233	2025-11-28 12:03:34.233
\.


--
-- Data for Name: media_attachments; Type: TABLE DATA; Schema: public; Owner: dms_user
--

COPY public.media_attachments (id, "responseId", filename, "originalName", "mimeType", "fileSize", "filePath", "thumbnailPath", "uploadedAt", "uploadedBy") FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: dms_user
--

COPY public.permissions (id, name, code, category, description, "createdAt") FROM stdin;
fe0e0ea5-08f3-4d12-9f48-39246bda2fd1	Create Assessment	CREATE_ASSESSMENT	assessment	Can create new assessments	2025-11-28 12:03:33.106
07bd2bf5-ada4-48f4-ba4f-6477f527465d	View Assessment	VIEW_ASSESSMENT	assessment	Can view assessments	2025-11-28 12:03:33.118
560595bb-0723-4075-ad6b-53b2224ef1b4	Edit Assessment	EDIT_ASSESSMENT	assessment	Can edit own assessments	2025-11-28 12:03:33.125
7334115a-da7b-421c-843a-61f559c9acac	Verify Assessment	VERIFY_ASSESSMENT	assessment	Can verify assessments	2025-11-28 12:03:33.131
bb39e999-6410-47db-9cd3-6a2ef33519ad	Publish Assessment	PUBLISH_ASSESSMENT	assessment	Can publish verified assessments	2025-11-28 12:03:33.137
a2bb1250-bf54-4abd-8fbc-440860ac9c98	Create Response	CREATE_RESPONSE	response	Can create response plans	2025-11-28 12:03:33.143
c828ad30-c59c-4635-a4f2-378cccd7e856	View Response	VIEW_RESPONSE	response	Can view response plans	2025-11-28 12:03:33.149
93d4b044-263d-4b7e-8c45-cfee2c482c34	Edit Response	EDIT_RESPONSE	response	Can edit own responses	2025-11-28 12:03:33.155
64b282d9-61c7-43ad-a7b1-aa572b43cde7	Verify Response	VERIFY_RESPONSE	response	Can verify responses	2025-11-28 12:03:33.161
497ba792-d113-40ad-a16e-931cd667d374	Execute Response	EXECUTE_RESPONSE	response	Can execute response activities	2025-11-28 12:03:33.167
3c1bcf07-4c97-44d5-8c53-d19cf8d7c422	View Entities	VIEW_ENTITIES	entity	Can view assigned entities	2025-11-28 12:03:33.171
f73076d9-2a3f-420e-8a0e-a7025c847b14	Manage Entities	MANAGE_ENTITIES	entity	Can manage entity assignments	2025-11-28 12:03:33.178
fcdd20b2-29ad-4504-976d-13b3eeb3a721	View Crisis Dashboard	VIEW_CRISIS_DASHBOARD	dashboard	Can access crisis management dashboard	2025-11-28 12:03:33.185
09110735-83c8-417b-81de-4bbb7e387153	View Situation Dashboard	VIEW_SITUATION_DASHBOARD	dashboard	Can access situation awareness dashboard	2025-11-28 12:03:33.191
261053f9-7191-44ee-8126-ffd13ab8544d	View Donor Dashboard	VIEW_DONOR_DASHBOARD	dashboard	Can access donor dashboard	2025-11-28 12:03:33.197
009c60b2-08d5-44bf-a8e8-5db66069fc2b	Manage Users	MANAGE_USERS	user	Can create and manage users	2025-11-28 12:03:33.204
3fee3cb6-83b9-4033-b1aa-700e4aadee91	Assign Roles	ASSIGN_ROLES	user	Can assign roles to users	2025-11-28 12:03:33.21
dc874490-ab1e-43e2-b841-36167db15d2d	View Audit Logs	VIEW_AUDIT_LOGS	audit	Can view system audit logs	2025-11-28 12:03:33.217
004f9898-c67e-4b75-8a1d-2817bebfd93c	View Sync Conflicts	VIEW_SYNC_CONFLICTS	sync	Can view synchronization conflicts	2025-11-28 12:03:33.224
9b014b3d-010a-4fe7-9bfe-ebb2464d2f3f	Resolve Sync Conflicts	RESOLVE_SYNC_CONFLICTS	sync	Can resolve sync conflicts	2025-11-28 12:03:33.23
\.


--
-- Data for Name: population_assessments; Type: TABLE DATA; Schema: public; Owner: dms_user
--

COPY public.population_assessments ("rapidAssessmentId", "totalHouseholds", "totalPopulation", "populationMale", "populationFemale", "populationUnder5", "pregnantWomen", "lactatingMothers", "personWithDisability", "elderlyPersons", "separatedChildren", "numberLivesLost", "numberInjured", "additionalPopulationDetails") FROM stdin;
570dcd7e-0215-41d0-b4e6-48f736b31318	4	20	4	16	0	0	0	0	0	0	6	12	
2c4bcc0f-ddc1-4f44-8471-a715ef0cfdd0	2	10	2	8	2	0	0	0	0	0	2	4	
\.


--
-- Data for Name: preliminary_assessments; Type: TABLE DATA; Schema: public; Owner: dms_user
--

COPY public.preliminary_assessments (id, "reportingDate", "reportingLatitude", "reportingLongitude", "reportingLGA", "reportingWard", "numberLivesLost", "numberInjured", "numberDisplaced", "numberHousesAffected", "numberSchoolsAffected", "schoolsAffected", "numberMedicalFacilitiesAffected", "medicalFacilitiesAffected", "estimatedAgriculturalLandsAffected", "reportingAgent", "additionalDetails", "incidentId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: rapid_assessments; Type: TABLE DATA; Schema: public; Owner: dms_user
--

COPY public.rapid_assessments (id, "rapidAssessmentType", "rapidAssessmentDate", "assessorId", "entityId", "assessorName", location, coordinates, status, priority, "versionNumber", "isOfflineCreated", "syncStatus", "verificationStatus", "verifiedAt", "verifiedBy", "rejectionReason", "rejectionFeedback", "mediaAttachments", "createdAt", "updatedAt", "gapAnalysis", "incidentId") FROM stdin;
c022bcbe-d0db-49f1-a605-7d3e44f24038	HEALTH	2025-10-15 00:00:00	2b903a08-c10c-430c-af70-e489dc65b2fc	entity-1	Field Assessor	Maiduguri Metropolitan	{"accuracy": 10, "latitude": 11.8311, "longitude": 13.1511, "timestamp": "2025-11-28T12:03:34.238Z", "captureMethod": "GPS"}	PUBLISHED	HIGH	1	f	PENDING	VERIFIED	\N	\N	\N	\N	\N	2025-11-28 12:03:34.241	2025-11-28 12:03:34.241	\N	incident-flood-001
bb0f8dff-3641-41bb-bea0-67d388d146eb	WASH	2025-10-16 00:00:00	2b903a08-c10c-430c-af70-e489dc65b2fc	entity-2	Field Assessor	Jere Local Government	{"accuracy": 8, "latitude": 11.8822, "longitude": 13.2143, "timestamp": "2025-11-28T12:03:34.239Z", "captureMethod": "GPS"}	SUBMITTED	CRITICAL	1	f	PENDING	VERIFIED	\N	\N	\N	\N	\N	2025-11-28 12:03:34.252	2025-11-28 12:03:34.252	\N	incident-flood-001
822a4ab7-2122-463c-a026-ec7de000dc20	SHELTER	2025-10-16 00:00:00	60173e37-d242-4e05-b808-64cad3a61297	entity-5	Multi Role Test User	IDP Camp Dalori	{"accuracy": 12, "latitude": 11.7833, "longitude": 13.2167, "timestamp": "2025-11-28T12:03:34.239Z", "captureMethod": "GPS"}	SUBMITTED	MEDIUM	1	f	PENDING	VERIFIED	\N	\N	\N	\N	\N	2025-11-28 12:03:34.262	2025-11-28 12:03:34.262	\N	incident-flood-001
6470db6e-2103-474f-9bcf-acf52391d40e	FOOD	2025-10-17 00:00:00	2b903a08-c10c-430c-af70-e489dc65b2fc	entity-3	Field Assessor	Gwoza Local Government	{"accuracy": 15, "latitude": 11.0417, "longitude": 13.6875, "timestamp": "2025-11-28T12:03:34.239Z", "captureMethod": "GPS"}	PUBLISHED	HIGH	1	f	PENDING	VERIFIED	\N	\N	\N	\N	\N	2025-11-28 12:03:34.274	2025-11-28 12:03:34.274	\N	incident-drought-001
28659d2b-634c-47b2-b89f-15991ab07e1a	SECURITY	2025-10-17 00:00:00	60173e37-d242-4e05-b808-64cad3a61297	entity-4	Multi Role Test User	Primary Health Center Maiduguri	{"accuracy": 5, "latitude": 11.8467, "longitude": 13.1569, "timestamp": "2025-11-28T12:03:34.239Z", "captureMethod": "GPS"}	SUBMITTED	LOW	1	f	PENDING	VERIFIED	\N	\N	\N	\N	\N	2025-11-28 12:03:34.284	2025-11-28 12:03:34.284	\N	incident-flood-001
2c4bcc0f-ddc1-4f44-8471-a715ef0cfdd0	POPULATION	2025-12-02 11:33:15.815	60173e37-d242-4e05-b808-64cad3a61297	entity-1	Multi Role Test User		\N	PUBLISHED	MEDIUM	1	f	SYNCED	VERIFIED	2025-12-02 11:33:47.554	\N	\N	\N	[]	2025-12-02 11:33:15.86	2025-12-02 11:33:47.555	\N	incident-flood-001
570dcd7e-0215-41d0-b4e6-48f736b31318	POPULATION	2025-12-02 11:32:08.324	60173e37-d242-4e05-b808-64cad3a61297	entity-3	Multi Role Test User		\N	PUBLISHED	MEDIUM	1	f	SYNCED	VERIFIED	2025-12-02 11:33:51.777	\N	\N	\N	[]	2025-12-02 11:32:08.404	2025-12-02 11:33:51.778	\N	incident-flood-001
\.


--
-- Data for Name: rapid_responses; Type: TABLE DATA; Schema: public; Owner: dms_user
--

COPY public.rapid_responses (id, "responderId", "entityId", "assessmentId", type, priority, status, description, resources, timeline, "versionNumber", "isOfflineCreated", "verificationStatus", "verifiedAt", "verifiedBy", "createdAt", "updatedAt", "donorId", "commitmentId", items, "offlineId", "plannedDate", "rejectionFeedback", "rejectionReason", "responseDate", "syncStatus") FROM stdin;
\.


--
-- Data for Name: report_configurations; Type: TABLE DATA; Schema: public; Owner: dms_user
--

COPY public.report_configurations (id, "templateId", name, filters, aggregations, visualizations, schedule, "createdBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: report_executions; Type: TABLE DATA; Schema: public; Owner: dms_user
--

COPY public.report_executions (id, "configurationId", status, format, "filePath", "generatedAt", error, "createdAt") FROM stdin;
\.


--
-- Data for Name: report_templates; Type: TABLE DATA; Schema: public; Owner: dms_user
--

COPY public.report_templates (id, name, description, type, layout, "createdById", "isPublic", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: dms_user
--

COPY public.role_permissions (id, "roleId", "permissionId") FROM stdin;
225131d9-17fa-4ba9-8b1b-815c215f963e	765e6da8-b05c-4705-a718-c8fb1b86336d	fe0e0ea5-08f3-4d12-9f48-39246bda2fd1
7584ca83-0bce-4912-9e2f-0c46a8439a98	765e6da8-b05c-4705-a718-c8fb1b86336d	07bd2bf5-ada4-48f4-ba4f-6477f527465d
7ad980db-a873-49a1-9bbe-5cc35325f1a1	765e6da8-b05c-4705-a718-c8fb1b86336d	560595bb-0723-4075-ad6b-53b2224ef1b4
f91c7e79-904f-40f1-a629-124c92d78067	765e6da8-b05c-4705-a718-c8fb1b86336d	3c1bcf07-4c97-44d5-8c53-d19cf8d7c422
28bf4ae8-38a5-420f-935b-735972239824	765e6da8-b05c-4705-a718-c8fb1b86336d	09110735-83c8-417b-81de-4bbb7e387153
6e621e0b-ef56-4315-af8c-ad116a98448b	d231c87b-7013-4216-9c2f-ac7604a8d938	fe0e0ea5-08f3-4d12-9f48-39246bda2fd1
67d8036f-f1ff-474e-b139-e0c011821e90	d231c87b-7013-4216-9c2f-ac7604a8d938	07bd2bf5-ada4-48f4-ba4f-6477f527465d
d24f56be-2adc-4d65-a419-5b8a45d4675f	d231c87b-7013-4216-9c2f-ac7604a8d938	560595bb-0723-4075-ad6b-53b2224ef1b4
00edfe02-cb28-41ca-93cd-8fd744354999	d231c87b-7013-4216-9c2f-ac7604a8d938	7334115a-da7b-421c-843a-61f559c9acac
6fb02da0-5b1b-4845-b6f1-f621a5bfe3ae	d231c87b-7013-4216-9c2f-ac7604a8d938	bb39e999-6410-47db-9cd3-6a2ef33519ad
bdf4a2b7-ce77-4305-a037-a9a33ef8af2c	d231c87b-7013-4216-9c2f-ac7604a8d938	a2bb1250-bf54-4abd-8fbc-440860ac9c98
273eb053-e82c-4e2a-ba0e-299d4cce0148	d231c87b-7013-4216-9c2f-ac7604a8d938	c828ad30-c59c-4635-a4f2-378cccd7e856
3d4aac02-58ca-4625-aeed-2ac82f375729	d231c87b-7013-4216-9c2f-ac7604a8d938	93d4b044-263d-4b7e-8c45-cfee2c482c34
207cd1d0-d806-484c-95c5-ac176b3a64cd	d231c87b-7013-4216-9c2f-ac7604a8d938	64b282d9-61c7-43ad-a7b1-aa572b43cde7
92108bd1-d873-4cc7-b454-bc10ba9ff5f9	d231c87b-7013-4216-9c2f-ac7604a8d938	3c1bcf07-4c97-44d5-8c53-d19cf8d7c422
ac485c86-0a7e-47ab-9426-0272338abc17	d231c87b-7013-4216-9c2f-ac7604a8d938	f73076d9-2a3f-420e-8a0e-a7025c847b14
fdf8cba6-0f6c-43b7-8ee7-acae6fc91e97	d231c87b-7013-4216-9c2f-ac7604a8d938	fcdd20b2-29ad-4504-976d-13b3eeb3a721
13261ad1-e41a-45cf-aa80-b0ac7d16bf4d	d231c87b-7013-4216-9c2f-ac7604a8d938	09110735-83c8-417b-81de-4bbb7e387153
85c570e2-0519-482c-83f5-c1ebb7ab37e5	d231c87b-7013-4216-9c2f-ac7604a8d938	004f9898-c67e-4b75-8a1d-2817bebfd93c
d30dd159-e940-4246-aba6-a2a4b609f7b0	d231c87b-7013-4216-9c2f-ac7604a8d938	9b014b3d-010a-4fe7-9bfe-ebb2464d2f3f
cea8faf1-3187-4e71-a5f2-31e0a38e7d6c	05930b44-6a40-48e8-a95e-c421da917a74	07bd2bf5-ada4-48f4-ba4f-6477f527465d
f6b9cbff-a388-4f43-bcd6-aaaa48cb7f3b	05930b44-6a40-48e8-a95e-c421da917a74	a2bb1250-bf54-4abd-8fbc-440860ac9c98
0f72e761-611a-4c59-b5e9-84bed70bcb5a	05930b44-6a40-48e8-a95e-c421da917a74	c828ad30-c59c-4635-a4f2-378cccd7e856
2898e5ad-96f0-4646-839b-c4753cab204a	05930b44-6a40-48e8-a95e-c421da917a74	93d4b044-263d-4b7e-8c45-cfee2c482c34
4c437580-45de-4cb1-babf-9defe5dd5ded	05930b44-6a40-48e8-a95e-c421da917a74	497ba792-d113-40ad-a16e-931cd667d374
d05aeb22-349e-41a4-9017-99416db6f807	05930b44-6a40-48e8-a95e-c421da917a74	3c1bcf07-4c97-44d5-8c53-d19cf8d7c422
df511495-e26f-4f7c-8b98-9d5c38294d1a	05930b44-6a40-48e8-a95e-c421da917a74	09110735-83c8-417b-81de-4bbb7e387153
c78f7b5e-c185-40d1-8d7b-85ecb2f222fb	f6c2d45e-b6de-4562-9d03-90b30ae2af9d	07bd2bf5-ada4-48f4-ba4f-6477f527465d
c27af1ee-a38b-4712-a66f-5c2d5c547694	f6c2d45e-b6de-4562-9d03-90b30ae2af9d	c828ad30-c59c-4635-a4f2-378cccd7e856
a196998d-a2be-4cec-8d81-27fb5e2a6732	f6c2d45e-b6de-4562-9d03-90b30ae2af9d	261053f9-7191-44ee-8126-ffd13ab8544d
e3147e37-af89-4815-8df1-92f4117fff2c	126c2400-3ee2-4086-ae76-196967618454	fe0e0ea5-08f3-4d12-9f48-39246bda2fd1
517b27f7-e9c3-44af-91c0-bc9fefbb669a	126c2400-3ee2-4086-ae76-196967618454	07bd2bf5-ada4-48f4-ba4f-6477f527465d
14d93bed-f9fd-4199-bfc1-f39420fa223a	126c2400-3ee2-4086-ae76-196967618454	560595bb-0723-4075-ad6b-53b2224ef1b4
86d0d0b1-2633-414f-ac90-7282b2b0d148	126c2400-3ee2-4086-ae76-196967618454	7334115a-da7b-421c-843a-61f559c9acac
c56a0dbf-2c21-46d7-a080-5bd3d8643c95	126c2400-3ee2-4086-ae76-196967618454	bb39e999-6410-47db-9cd3-6a2ef33519ad
7e52613b-9fc4-4e58-b92c-d9d397abdb5e	126c2400-3ee2-4086-ae76-196967618454	a2bb1250-bf54-4abd-8fbc-440860ac9c98
ae7d6925-d927-49d0-bed8-5a22aa470acc	126c2400-3ee2-4086-ae76-196967618454	c828ad30-c59c-4635-a4f2-378cccd7e856
376c261a-60f6-414d-9404-021b168c4525	126c2400-3ee2-4086-ae76-196967618454	93d4b044-263d-4b7e-8c45-cfee2c482c34
08887a56-1f46-40e6-b9d3-5b5b62aab868	126c2400-3ee2-4086-ae76-196967618454	64b282d9-61c7-43ad-a7b1-aa572b43cde7
040d802c-f847-4200-86b2-0c7dc04aec39	126c2400-3ee2-4086-ae76-196967618454	497ba792-d113-40ad-a16e-931cd667d374
93d9b3ab-d339-481d-a48b-b81a9f1da625	126c2400-3ee2-4086-ae76-196967618454	3c1bcf07-4c97-44d5-8c53-d19cf8d7c422
c6a3ffef-b703-4e56-80b3-4fd97b357719	126c2400-3ee2-4086-ae76-196967618454	f73076d9-2a3f-420e-8a0e-a7025c847b14
dd6b32c3-af88-408d-8877-948f35a2c680	126c2400-3ee2-4086-ae76-196967618454	fcdd20b2-29ad-4504-976d-13b3eeb3a721
f18aaeaf-c8aa-4f3e-8f3f-c06cbe0b9825	126c2400-3ee2-4086-ae76-196967618454	09110735-83c8-417b-81de-4bbb7e387153
ef05e5ee-eb88-409c-b94e-91fe5950e6b5	126c2400-3ee2-4086-ae76-196967618454	261053f9-7191-44ee-8126-ffd13ab8544d
ad01d90a-5448-4a30-a8d9-ec5e86d2337e	126c2400-3ee2-4086-ae76-196967618454	009c60b2-08d5-44bf-a8e8-5db66069fc2b
397d6096-84a7-429c-9937-152b1712f5a4	126c2400-3ee2-4086-ae76-196967618454	3fee3cb6-83b9-4033-b1aa-700e4aadee91
ec710078-6750-4f3d-af67-47284ad37710	126c2400-3ee2-4086-ae76-196967618454	dc874490-ab1e-43e2-b841-36167db15d2d
d7c3e9fa-cd76-4f7d-a3bf-e34397a4124f	126c2400-3ee2-4086-ae76-196967618454	004f9898-c67e-4b75-8a1d-2817bebfd93c
825bb538-09c0-431d-a765-155cbc4e03bc	126c2400-3ee2-4086-ae76-196967618454	9b014b3d-010a-4fe7-9bfe-ebb2464d2f3f
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: dms_user
--

COPY public.roles (id, name, description, "createdAt") FROM stdin;
765e6da8-b05c-4705-a718-c8fb1b86336d	ASSESSOR	Field assessors who conduct rapid assessments	2025-11-28 12:03:33.237
d231c87b-7013-4216-9c2f-ac7604a8d938	COORDINATOR	Coordinators who verify and manage assessments and responses	2025-11-28 12:03:33.247
05930b44-6a40-48e8-a95e-c421da917a74	RESPONDER	Response teams who execute intervention activities	2025-11-28 12:03:33.254
f6c2d45e-b6de-4562-9d03-90b30ae2af9d	DONOR	Donors and funding organizations	2025-11-28 12:03:33.261
126c2400-3ee2-4086-ae76-196967618454	ADMIN	System administrators with full access	2025-11-28 12:03:33.267
\.


--
-- Data for Name: security_assessments; Type: TABLE DATA; Schema: public; Owner: dms_user
--

COPY public.security_assessments ("rapidAssessmentId", "isSafeFromViolence", "gbvCasesReported", "hasSecurityPresence", "hasProtectionReportingMechanism", "vulnerableGroupsHaveAccess", "hasLighting", "additionalSecurityDetails") FROM stdin;
28659d2b-634c-47b2-b89f-15991ab07e1a	f	f	t	f	f	t	\N
\.


--
-- Data for Name: shelter_assessments; Type: TABLE DATA; Schema: public; Owner: dms_user
--

COPY public.shelter_assessments ("rapidAssessmentId", "areSheltersSufficient", "hasSafeStructures", "shelterTypes", "requiredShelterType", "numberSheltersRequired", "areOvercrowded", "provideWeatherProtection", "additionalShelterDetails") FROM stdin;
822a4ab7-2122-463c-a026-ec7de000dc20	t	f	["Tents","Temporary shelters","Public buildings"]	["Tents","Emergency shelters"]	53	t	f	\N
\.


--
-- Data for Name: sync_conflicts; Type: TABLE DATA; Schema: public; Owner: dms_user
--

COPY public.sync_conflicts (id, "entityType", "entityId", "conflictDate", "resolutionMethod", "winningVersion", "losingVersion", "resolvedAt", "coordinatorNotified", "coordinatorNotifiedAt", "responseId") FROM stdin;
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: dms_user
--

COPY public.user_roles (id, "userId", "roleId", "assignedAt", "assignedBy") FROM stdin;
91e42fc5-6848-4adf-b7b7-c31c5d9031a1	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81	126c2400-3ee2-4086-ae76-196967618454	2025-11-28 12:03:33.744	system
f73de8e2-6d41-4f08-a5f5-9bf7d25e93b8	1757655f-eeb3-471d-9cab-21835cb6692f	d231c87b-7013-4216-9c2f-ac7604a8d938	2025-11-28 12:03:33.819	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81
cefe3980-9d61-47b5-90b6-0506fbf1e1b5	e29a35ac-8c66-424d-a188-b6b97af91e6d	05930b44-6a40-48e8-a95e-c421da917a74	2025-11-28 12:03:34.001	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81
cb55a06a-11d3-4969-b47f-145d6a640058	2b903a08-c10c-430c-af70-e489dc65b2fc	765e6da8-b05c-4705-a718-c8fb1b86336d	2025-11-28 12:03:34.081	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81
b565635a-d704-4aa2-b5cf-47cae2f2c061	bb78b6e6-d7d8-43c9-a3b7-9b1bac8d04d4	f6c2d45e-b6de-4562-9d03-90b30ae2af9d	2025-11-28 12:03:34.198	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81
106a3922-7cd7-4010-bcce-31b8f768caae	43faaf02-b10e-4ce2-9ce3-a135dc12b3f1	d231c87b-7013-4216-9c2f-ac7604a8d938	2025-11-28 12:03:34.408	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81
b6677b19-505f-49ea-b19c-bcdedb798e73	06e7234e-f469-40bf-a91e-86942c47c203	d231c87b-7013-4216-9c2f-ac7604a8d938	2025-11-28 12:21:25.034	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81
0709c6f3-1c12-42c7-8e64-bc7e20e746e9	06e7234e-f469-40bf-a91e-86942c47c203	126c2400-3ee2-4086-ae76-196967618454	2025-11-28 12:21:25.034	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81
fc07cda8-3336-48fc-af35-3a467650d7df	60173e37-d242-4e05-b808-64cad3a61297	765e6da8-b05c-4705-a718-c8fb1b86336d	2025-11-28 22:42:07.042	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81
15ef3641-0fc4-4bdc-b24d-dd62076586d3	60173e37-d242-4e05-b808-64cad3a61297	d231c87b-7013-4216-9c2f-ac7604a8d938	2025-11-28 22:42:07.042	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81
860779f3-6a50-4db4-8355-c85ccf056e0d	60173e37-d242-4e05-b808-64cad3a61297	f6c2d45e-b6de-4562-9d03-90b30ae2af9d	2025-11-28 22:42:07.042	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81
ef0c8c88-c970-440e-9c1a-17c82641c8fd	60173e37-d242-4e05-b808-64cad3a61297	05930b44-6a40-48e8-a95e-c421da917a74	2025-11-28 22:42:07.042	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81
3e8e05c1-5184-4316-b79a-d61a57f44204	60173e37-d242-4e05-b808-64cad3a61297	126c2400-3ee2-4086-ae76-196967618454	2025-11-28 22:42:07.042	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81
41721f06-31f4-43b4-9ea1-1d3373cc8075	ad711d3f-7e86-48a1-aa64-536d08be41aa	765e6da8-b05c-4705-a718-c8fb1b86336d	2025-11-28 22:43:51.192	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81
b8edde7b-5847-47d0-a144-ae5ef6de193f	ad711d3f-7e86-48a1-aa64-536d08be41aa	05930b44-6a40-48e8-a95e-c421da917a74	2025-11-28 22:43:51.192	06b0d2d3-b3f0-4473-a11b-9d4452d3fd81
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: dms_user
--

COPY public.users (id, email, username, "passwordHash", name, phone, organization, "isActive", "isLocked", "lastLogin", "createdAt", "updatedAt") FROM stdin;
e29a35ac-8c66-424d-a188-b6b97af91e6d	responder@dms.gov.ng	responder	$2b$10$dckQtGVWNl9Etz6FOUP3/O0fEbCsm/oLs3/rKZ8LM2XR5em1g.zNy	Response Responder	\N	Borno State Emergency Management Agency	t	f	\N	2025-11-28 12:03:33.992	2025-11-28 12:03:33.992
bb78b6e6-d7d8-43c9-a3b7-9b1bac8d04d4	donor@test.com	donor	$2b$10$HZGfmA1Ikeoq2gdJsEIzTePUVk9XEGhQxCkmOW4QmpVNgmpsxJkJu	Donor Organization Contact	\N	Test Donor Organization	t	f	\N	2025-11-28 12:03:34.191	2025-11-28 12:03:34.191
43faaf02-b10e-4ce2-9ce3-a135dc12b3f1	coordinator@test.com	e2e-coordinator	$2b$10$DQqcdEnOzWp83nMaBM9Be.iSPhLkNVoR02PPdvGcInvAg1Q1lG/by	E2E Test Coordinator	\N	Test Organization	t	f	\N	2025-11-28 12:03:34.401	2025-11-28 12:03:34.401
2b903a08-c10c-430c-af70-e489dc65b2fc	assessor@test.com	e2e-assessor	$2b$10$JpURwjQxRrOYS.eaQCeLueW/asyDrQ4oZS3KYu45BmreCUdWslsua	Field Assessor	\N	Borno State Emergency Management Agency	t	f	\N	2025-11-28 12:03:34.074	2025-11-28 12:03:34.474
06e7234e-f469-40bf-a91e-86942c47c203	adco@email.com	adco	$2b$10$2hORx6XpD3XrOBAYwzr8zegusAwWRhOBkz2ZkxFzk3qgnPXa8k06W	Ad Co		Test Organization	t	f	2025-11-28 12:21:56.562	2025-11-28 12:21:25.032	2025-11-28 12:21:56.564
06b0d2d3-b3f0-4473-a11b-9d4452d3fd81	admin@dms.gov.ng	admin	$2b$10$ZbmBK/GKtyMJepuk1rQTQeuK5.tUctHrRn.lXV2SF4P9aXyCDQYKW	System Administrator	\N	Disaster Management System	t	f	2025-11-28 17:10:01.105	2025-11-28 12:03:33.735	2025-11-28 17:10:01.107
ad711d3f-7e86-48a1-aa64-536d08be41aa	asre@email.com	asre	$2b$10$9v6CHXsCZY1vISNC.ZsmZe4YzpbAZyQMp5MQCCAHnagTkX3g2rk1K	As Re			f	f	\N	2025-11-28 22:43:14.139	2025-11-28 22:43:51.191
1757655f-eeb3-471d-9cab-21835cb6692f	coordinator@dms.gov.ng	coordinator	$2b$10$rmXjPvAyyJoZpH51vDZFse8QjwvoTqLZAbghkLW.uayusQb55Ydo6	Crisis Coordinator	\N	Borno State Emergency Management Agency	t	f	2025-12-02 11:25:00.711	2025-11-28 12:03:33.812	2025-12-02 11:25:00.712
60173e37-d242-4e05-b808-64cad3a61297	multirole@dms.gov.ng	multirole	$2b$10$xvvU4LWxV.tb1X0XuvEK4eaxYmVTDAABhtdbpJ4s2xwCWi0X1yq.S	Multi Role Test User		Borno State Emergency Management Agency	t	f	2025-12-02 11:29:36.446	2025-11-28 12:03:33.893	2025-12-02 11:29:36.447
\.


--
-- Data for Name: wash_assessments; Type: TABLE DATA; Schema: public; Owner: dms_user
--

COPY public.wash_assessments ("rapidAssessmentId", "waterSource", "isWaterSufficient", "hasCleanWaterAccess", "functionalLatrinesAvailable", "areLatrinesSufficient", "hasHandwashingFacilities", "hasOpenDefecationConcerns", "additionalWashDetails") FROM stdin;
bb0f8dff-3641-41bb-bea0-67d388d146eb	["Well","Borehole","River"]	f	f	10	f	t	f	\N
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: donor_commitments donor_commitments_pkey; Type: CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.donor_commitments
    ADD CONSTRAINT donor_commitments_pkey PRIMARY KEY (id);


--
-- Name: donors donors_pkey; Type: CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.donors
    ADD CONSTRAINT donors_pkey PRIMARY KEY (id);


--
-- Name: entities entities_pkey; Type: CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.entities
    ADD CONSTRAINT entities_pkey PRIMARY KEY (id);


--
-- Name: entity_assignments entity_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.entity_assignments
    ADD CONSTRAINT entity_assignments_pkey PRIMARY KEY (id);


--
-- Name: food_assessments food_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.food_assessments
    ADD CONSTRAINT food_assessments_pkey PRIMARY KEY ("rapidAssessmentId");


--
-- Name: health_assessments health_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.health_assessments
    ADD CONSTRAINT health_assessments_pkey PRIMARY KEY ("rapidAssessmentId");


--
-- Name: incidents incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_pkey PRIMARY KEY (id);


--
-- Name: media_attachments media_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.media_attachments
    ADD CONSTRAINT media_attachments_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: population_assessments population_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.population_assessments
    ADD CONSTRAINT population_assessments_pkey PRIMARY KEY ("rapidAssessmentId");


--
-- Name: preliminary_assessments preliminary_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.preliminary_assessments
    ADD CONSTRAINT preliminary_assessments_pkey PRIMARY KEY (id);


--
-- Name: rapid_assessments rapid_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.rapid_assessments
    ADD CONSTRAINT rapid_assessments_pkey PRIMARY KEY (id);


--
-- Name: rapid_responses rapid_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.rapid_responses
    ADD CONSTRAINT rapid_responses_pkey PRIMARY KEY (id);


--
-- Name: report_configurations report_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.report_configurations
    ADD CONSTRAINT report_configurations_pkey PRIMARY KEY (id);


--
-- Name: report_executions report_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.report_executions
    ADD CONSTRAINT report_executions_pkey PRIMARY KEY (id);


--
-- Name: report_templates report_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: security_assessments security_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.security_assessments
    ADD CONSTRAINT security_assessments_pkey PRIMARY KEY ("rapidAssessmentId");


--
-- Name: shelter_assessments shelter_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.shelter_assessments
    ADD CONSTRAINT shelter_assessments_pkey PRIMARY KEY ("rapidAssessmentId");


--
-- Name: sync_conflicts sync_conflicts_pkey; Type: CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.sync_conflicts
    ADD CONSTRAINT sync_conflicts_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wash_assessments wash_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.wash_assessments
    ADD CONSTRAINT wash_assessments_pkey PRIMARY KEY ("rapidAssessmentId");


--
-- Name: donor_commitments_donorId_entityId_idx; Type: INDEX; Schema: public; Owner: dms_user
--

CREATE INDEX "donor_commitments_donorId_entityId_idx" ON public.donor_commitments USING btree ("donorId", "entityId");


--
-- Name: donor_commitments_donorId_incidentId_idx; Type: INDEX; Schema: public; Owner: dms_user
--

CREATE INDEX "donor_commitments_donorId_incidentId_idx" ON public.donor_commitments USING btree ("donorId", "incidentId");


--
-- Name: donor_commitments_entityId_incidentId_idx; Type: INDEX; Schema: public; Owner: dms_user
--

CREATE INDEX "donor_commitments_entityId_incidentId_idx" ON public.donor_commitments USING btree ("entityId", "incidentId");


--
-- Name: donor_commitments_status_idx; Type: INDEX; Schema: public; Owner: dms_user
--

CREATE INDEX donor_commitments_status_idx ON public.donor_commitments USING btree (status);


--
-- Name: entities_name_type_key; Type: INDEX; Schema: public; Owner: dms_user
--

CREATE UNIQUE INDEX entities_name_type_key ON public.entities USING btree (name, type);


--
-- Name: entity_assignments_userId_entityId_key; Type: INDEX; Schema: public; Owner: dms_user
--

CREATE UNIQUE INDEX "entity_assignments_userId_entityId_key" ON public.entity_assignments USING btree ("userId", "entityId");


--
-- Name: permissions_code_key; Type: INDEX; Schema: public; Owner: dms_user
--

CREATE UNIQUE INDEX permissions_code_key ON public.permissions USING btree (code);


--
-- Name: rapid_assessments_assessorId_createdAt_idx; Type: INDEX; Schema: public; Owner: dms_user
--

CREATE INDEX "rapid_assessments_assessorId_createdAt_idx" ON public.rapid_assessments USING btree ("assessorId", "createdAt");


--
-- Name: rapid_assessments_createdAt_rapidAssessmentType_idx; Type: INDEX; Schema: public; Owner: dms_user
--

CREATE INDEX "rapid_assessments_createdAt_rapidAssessmentType_idx" ON public.rapid_assessments USING btree ("createdAt", "rapidAssessmentType");


--
-- Name: rapid_assessments_entityId_rapidAssessmentDate_idx; Type: INDEX; Schema: public; Owner: dms_user
--

CREATE INDEX "rapid_assessments_entityId_rapidAssessmentDate_idx" ON public.rapid_assessments USING btree ("entityId", "rapidAssessmentDate");


--
-- Name: rapid_assessments_incidentId_entityId_idx; Type: INDEX; Schema: public; Owner: dms_user
--

CREATE INDEX "rapid_assessments_incidentId_entityId_idx" ON public.rapid_assessments USING btree ("incidentId", "entityId");


--
-- Name: rapid_assessments_incidentId_rapidAssessmentDate_idx; Type: INDEX; Schema: public; Owner: dms_user
--

CREATE INDEX "rapid_assessments_incidentId_rapidAssessmentDate_idx" ON public.rapid_assessments USING btree ("incidentId", "rapidAssessmentDate");


--
-- Name: rapid_assessments_rapidAssessmentDate_rapidAssessmentType_idx; Type: INDEX; Schema: public; Owner: dms_user
--

CREATE INDEX "rapid_assessments_rapidAssessmentDate_rapidAssessmentType_idx" ON public.rapid_assessments USING btree ("rapidAssessmentDate", "rapidAssessmentType");


--
-- Name: rapid_assessments_rapidAssessmentType_rapidAssessmentDate_e_idx; Type: INDEX; Schema: public; Owner: dms_user
--

CREATE INDEX "rapid_assessments_rapidAssessmentType_rapidAssessmentDate_e_idx" ON public.rapid_assessments USING btree ("rapidAssessmentType", "rapidAssessmentDate", "entityId");


--
-- Name: rapid_assessments_status_priority_idx; Type: INDEX; Schema: public; Owner: dms_user
--

CREATE INDEX rapid_assessments_status_priority_idx ON public.rapid_assessments USING btree (status, priority);


--
-- Name: rapid_assessments_syncStatus_isOfflineCreated_idx; Type: INDEX; Schema: public; Owner: dms_user
--

CREATE INDEX "rapid_assessments_syncStatus_isOfflineCreated_idx" ON public.rapid_assessments USING btree ("syncStatus", "isOfflineCreated");


--
-- Name: rapid_responses_commitmentId_idx; Type: INDEX; Schema: public; Owner: dms_user
--

CREATE INDEX "rapid_responses_commitmentId_idx" ON public.rapid_responses USING btree ("commitmentId");


--
-- Name: rapid_responses_offlineId_key; Type: INDEX; Schema: public; Owner: dms_user
--

CREATE UNIQUE INDEX "rapid_responses_offlineId_key" ON public.rapid_responses USING btree ("offlineId");


--
-- Name: role_permissions_roleId_permissionId_key; Type: INDEX; Schema: public; Owner: dms_user
--

CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON public.role_permissions USING btree ("roleId", "permissionId");


--
-- Name: roles_name_key; Type: INDEX; Schema: public; Owner: dms_user
--

CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name);


--
-- Name: user_roles_userId_roleId_key; Type: INDEX; Schema: public; Owner: dms_user
--

CREATE UNIQUE INDEX "user_roles_userId_roleId_key" ON public.user_roles USING btree ("userId", "roleId");


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: dms_user
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_username_key; Type: INDEX; Schema: public; Owner: dms_user
--

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);


--
-- Name: audit_logs audit_logs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: donor_commitments donor_commitments_donorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.donor_commitments
    ADD CONSTRAINT "donor_commitments_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES public.donors(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: donor_commitments donor_commitments_entityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.donor_commitments
    ADD CONSTRAINT "donor_commitments_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: donor_commitments donor_commitments_incidentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.donor_commitments
    ADD CONSTRAINT "donor_commitments_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES public.incidents(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: entity_assignments entity_assignments_entityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.entity_assignments
    ADD CONSTRAINT "entity_assignments_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: entity_assignments entity_assignments_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.entity_assignments
    ADD CONSTRAINT "entity_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: food_assessments food_assessments_rapidAssessmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.food_assessments
    ADD CONSTRAINT "food_assessments_rapidAssessmentId_fkey" FOREIGN KEY ("rapidAssessmentId") REFERENCES public.rapid_assessments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: health_assessments health_assessments_rapidAssessmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.health_assessments
    ADD CONSTRAINT "health_assessments_rapidAssessmentId_fkey" FOREIGN KEY ("rapidAssessmentId") REFERENCES public.rapid_assessments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: media_attachments media_attachments_responseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.media_attachments
    ADD CONSTRAINT "media_attachments_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES public.rapid_responses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: population_assessments population_assessments_rapidAssessmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.population_assessments
    ADD CONSTRAINT "population_assessments_rapidAssessmentId_fkey" FOREIGN KEY ("rapidAssessmentId") REFERENCES public.rapid_assessments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: preliminary_assessments preliminary_assessments_incidentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.preliminary_assessments
    ADD CONSTRAINT "preliminary_assessments_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES public.incidents(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: rapid_assessments rapid_assessments_assessorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.rapid_assessments
    ADD CONSTRAINT "rapid_assessments_assessorId_fkey" FOREIGN KEY ("assessorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: rapid_assessments rapid_assessments_entityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.rapid_assessments
    ADD CONSTRAINT "rapid_assessments_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: rapid_assessments rapid_assessments_incidentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.rapid_assessments
    ADD CONSTRAINT "rapid_assessments_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES public.incidents(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: rapid_responses rapid_responses_assessmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.rapid_responses
    ADD CONSTRAINT "rapid_responses_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES public.rapid_assessments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: rapid_responses rapid_responses_commitmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.rapid_responses
    ADD CONSTRAINT "rapid_responses_commitmentId_fkey" FOREIGN KEY ("commitmentId") REFERENCES public.donor_commitments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: rapid_responses rapid_responses_donorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.rapid_responses
    ADD CONSTRAINT "rapid_responses_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES public.donors(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: rapid_responses rapid_responses_entityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.rapid_responses
    ADD CONSTRAINT "rapid_responses_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES public.entities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: rapid_responses rapid_responses_responderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.rapid_responses
    ADD CONSTRAINT "rapid_responses_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: report_configurations report_configurations_createdBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.report_configurations
    ADD CONSTRAINT "report_configurations_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: report_configurations report_configurations_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.report_configurations
    ADD CONSTRAINT "report_configurations_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public.report_templates(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: report_executions report_executions_configurationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.report_executions
    ADD CONSTRAINT "report_executions_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES public.report_configurations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: report_templates report_templates_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT "report_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: role_permissions role_permissions_permissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES public.permissions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: security_assessments security_assessments_rapidAssessmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.security_assessments
    ADD CONSTRAINT "security_assessments_rapidAssessmentId_fkey" FOREIGN KEY ("rapidAssessmentId") REFERENCES public.rapid_assessments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: shelter_assessments shelter_assessments_rapidAssessmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.shelter_assessments
    ADD CONSTRAINT "shelter_assessments_rapidAssessmentId_fkey" FOREIGN KEY ("rapidAssessmentId") REFERENCES public.rapid_assessments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sync_conflicts sync_conflicts_responseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.sync_conflicts
    ADD CONSTRAINT "sync_conflicts_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES public.rapid_responses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: user_roles user_roles_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_roles user_roles_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: wash_assessments wash_assessments_rapidAssessmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dms_user
--

ALTER TABLE ONLY public.wash_assessments
    ADD CONSTRAINT "wash_assessments_rapidAssessmentId_fkey" FOREIGN KEY ("rapidAssessmentId") REFERENCES public.rapid_assessments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: dms_user
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict QVO1RvLeJ19wAOciSbNAKMQWjwSLQh4H4LEwN25hlMNW3kNeiSh8a8kZTmbA9gC


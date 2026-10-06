-- =====================================================================
-- NABL "Find a Lab" — proposed PostgreSQL schema (PostgreSQL 16 + PostGIS + pgvector)
-- Source of truth: NABL_Labs_Data.xlsx (5 sheets, 30 identical columns) and
-- Centralized_list.xlsx ("Total Files": integrated labs + regulator flags).
-- Every column is tagged:  [M] master (from Excel, unchanged meaning)
--                          [D] derived (computed from master)
--                          [E] external / enrichment (not in Excel; optional, nullable)
--                          [A] admin-managed / governance
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE lab_type      AS ENUM ('Medical','Testing','Calibration','PTP','RMP');
CREATE TYPE record_status AS ENUM ('active','inactive');
CREATE TYPE acc_status    AS ENUM ('valid','ends_within_90_days','validity_passed','suspended','withdrawn','under_process');
CREATE TYPE geo_precision AS ENUM ('address','pin','pin3','city','state','none');
CREATE TYPE verification  AS ENUM ('unverified','source_listed','verified_by_nabl');
CREATE TYPE cr_status     AS ENUM ('Draft','Submitted','Under review','Technical review','Approved','Published','Correction required','Rejected');

-- ---------------------------------------------------------------- laboratory
CREATE TABLE laboratory (
  lab_id              TEXT PRIMARY KEY,                  -- [M] LabId (upper-cased; e.g. T-0119, M-0422)
  laboratory_name     TEXT NOT NULL,                     -- [M] LaboratoryName (HTML entities decoded)
  laboratory_type     lab_type NOT NULL,                 -- [M] Labtype / sheet name
  service_mode        TEXT,                              -- [M] LITypeOfLABbyService (Open to Others / In-house …)
  contact_person      TEXT,                              -- [M] ContactPerson
  email               TEXT,                              -- [M] ContactEmail
  mobile              TEXT,                              -- [M] ContactMobile
  landline            TEXT,                              -- [M] LandLine
  fax                 TEXT,                              -- [M] Fax
  address             TEXT,                              -- [M] PrimeAddress
  city                TEXT,                              -- [M] City
  state               TEXT,                              -- [M] State (normalised to current state/UT names)
  pincode             CHAR(6),                           -- [M] Pin
  nabl_zone           SMALLINT,                          -- [M] Zone
  is_new              BOOLEAN,                           -- [M] IsNew (99% empty in snapshot)
  additional_cert_cnt INT,                               -- [M] AdditionalCertificate
  scope_document_ref  TEXT,                              -- [M] ScopeURL (relative path; base URL admin-configured)
  sample_url          TEXT,                              -- [M] SampleURL
  -- derived
  district            TEXT,                              -- [D] PIN → district lookup (not in Excel)
  geo_point           GEOGRAPHY(Point,4326),             -- [D] geocoded
  geo_precision       geo_precision NOT NULL DEFAULT 'none', -- [D] pin / pin3 / city / state centroid
  slug                TEXT UNIQUE,                       -- [D] SEO URL /labs/<slug>
  search_tsv          TSVECTOR,                          -- [D] full-text (name, city, scope names)
  embedding           VECTOR(1024),                      -- [D] semantic search over name + scope text
  -- enrichment (never shown unless populated from a verified source)
  legal_entity_name   TEXT,                              -- [E]
  website             TEXT,                              -- [E]
  operating_hours     TEXT,                              -- [E]
  -- governance
  status              record_status NOT NULL DEFAULT 'active', -- [A]
  source              TEXT NOT NULL DEFAULT 'NABL master extract', -- [A]
  source_date         DATE,                              -- [A]
  record_owner        TEXT,                              -- [A]
  verification_status verification NOT NULL DEFAULT 'source_listed', -- [A]
  verified_at         TIMESTAMPTZ, verified_by TEXT,     -- [A]
  created_at          TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), updated_by TEXT, -- [A]
  version             INT NOT NULL DEFAULT 1             -- [A]
);
CREATE INDEX ON laboratory USING gist (geo_point);
CREATE INDEX ON laboratory USING gin (search_tsv);
CREATE INDEX ON laboratory USING gin (laboratory_name gin_trgm_ops);
CREATE INDEX ON laboratory USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON laboratory (laboratory_type, state, city);

-- ---------------------------------------------------------------- accreditation (versioned)
CREATE TABLE accreditation (
  accreditation_id    BIGSERIAL PRIMARY KEY,
  lab_id              TEXT NOT NULL REFERENCES laboratory,
  accreditation_body  TEXT NOT NULL DEFAULT 'NABL',
  accreditation_number TEXT,                             -- [M] Cert_No (4 numbers shared by two LabIds → not unique)
  valid_from          DATE,                              -- [M] Issue_Date (dd/mm/yyyy in source)
  valid_to            DATE,                              -- [M] ToDate
  extended_to         DATE,                              -- [M] ExtendDate (empty in snapshot) / Centralized "Extended Validity"
  amendment_date      DATE,                              -- [M] AmendmentDate
  certificate_url     TEXT,                              -- [M] CertUrl (empty in snapshot)
  status              acc_status NOT NULL,               -- [D] from dates + Centralized list (Expired/Suspended/under process) + admin action
  status_reason       TEXT,                              -- [A]
  is_current          BOOLEAN NOT NULL DEFAULT true,     -- [A] history kept as older rows
  verified_at         TIMESTAMPTZ, verified_by TEXT,     -- [A]
  source              TEXT, source_date DATE             -- [A]
);
CREATE INDEX ON accreditation (lab_id) WHERE is_current;
CREATE INDEX ON accreditation (valid_to);

-- ---------------------------------------------------------------- scope
-- Today's Excel gives discipline → group → sub-group (comma lists; split outside parentheses).
-- Parameter-level rows (parameter/method/range/unit/matrix/standard) are for the scope-PDF import.
CREATE TABLE scope (
  scope_id            BIGSERIAL PRIMARY KEY,
  lab_id              TEXT NOT NULL REFERENCES laboratory,
  accreditation_id    BIGINT REFERENCES accreditation,
  level               TEXT NOT NULL CHECK (level IN ('discipline','group','sub_group','parameter')),
  discipline          TEXT,                              -- [M] disciplineName
  group_name          TEXT,                              -- [M] groupName
  sub_group           TEXT,                              -- [M] subGrpName
  parameter           TEXT,                              -- [E] from scope document
  test_or_calibration TEXT,                              -- [E]
  method              TEXT, standard_ref TEXT,           -- [E]
  range_min NUMERIC, range_max NUMERIC, unit TEXT,       -- [E] calibration ranges (e.g. 0–100 bar)
  matrix              TEXT,                              -- [E] material / product
  facility_type       TEXT,                              -- [M] permanent / site / mobile
  scope_status        TEXT NOT NULL DEFAULT 'accredited',-- [A]
  valid_from DATE, valid_to DATE,                        -- [A]
  embedding           VECTOR(1024),                      -- [D]
  source              TEXT, source_date DATE, version INT DEFAULT 1 -- [A]
);
CREATE INDEX ON scope (lab_id, level);
CREATE INDEX ON scope USING hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------- taxonomy used by the semantic parser
CREATE TABLE scope_vocabulary (
  term TEXT PRIMARY KEY, lab_types lab_type[], discipline_patterns TEXT[], group_patterns TEXT[],
  sub_group_patterns TEXT[], is_parameter BOOLEAN DEFAULT false, synonyms TEXT[]   -- [A]
);

-- ---------------------------------------------------------------- services / facilities (enrichment)
CREATE TABLE service  (service_id BIGSERIAL PRIMARY KEY, lab_id TEXT REFERENCES laboratory, service_name TEXT NOT NULL,
  category TEXT, subcategory TEXT, description TEXT, scope_id BIGINT REFERENCES scope,  -- link ONLY when scope-backed
  source TEXT, verified BOOLEAN DEFAULT false);                                          -- [E]
CREATE TABLE facility (facility_id BIGSERIAL PRIMARY KEY, lab_id TEXT REFERENCES laboratory,
  facility_name TEXT NOT NULL,       -- permanent/site/mobile [M]; home collection, pickup, online booking, digital report, cold chain … [E]
  availability BOOLEAN, source TEXT, verified BOOLEAN DEFAULT false);
CREATE TABLE pricing  (pricing_id BIGSERIAL PRIMARY KEY, lab_id TEXT REFERENCES laboratory, service_id BIGINT REFERENCES service,
  price NUMERIC(12,2) NOT NULL, currency CHAR(3) DEFAULT 'INR', effective_date DATE, source TEXT, verified BOOLEAN DEFAULT false); -- [E]
CREATE TABLE tat      (tat_id BIGSERIAL PRIMARY KEY, lab_id TEXT REFERENCES laboratory, service_id BIGINT REFERENCES service,
  turnaround_hours INT NOT NULL, source TEXT, verified BOOLEAN DEFAULT false);                                                     -- [E]

-- ---------------------------------------------------------------- recognitions (Centralized list)
CREATE TABLE regulator (regulator_code TEXT PRIMARY KEY, name TEXT NOT NULL, ministry TEXT);
INSERT INTO regulator VALUES
 ('FSSAI','Food Safety and Standards Authority of India',NULL),('EIC','Export Inspection Council',NULL),
 ('APEDA','Agricultural and Processed Food Products Export Development Authority',NULL),('TEA BOARD','Tea Board India',NULL),
 ('SPICE BOARD','Spices Board India',NULL),('IOPEPC','Indian Oilseeds and Produce Export Promotion Council',NULL),
 ('CDB','Coconut Development Board',NULL),('Shefexil','Shellac and Forest Products Export Promotion Council',NULL);
CREATE TABLE recognition (
  recognition_id BIGSERIAL PRIMARY KEY, lab_id TEXT REFERENCES laboratory, regulator_code TEXT REFERENCES regulator,
  recognition_type TEXT DEFAULT 'Integrated / recognised lab', reference_number TEXT,   -- [E]
  valid_from DATE, valid_to DATE,                         -- [M] Centralized "Accreditation Cycle"/"Extended Validity"
  scope TEXT, source TEXT DEFAULT 'Centralized list', source_date DATE,                 -- "Last update on 15.09.2026"
  verification_status verification DEFAULT 'source_listed');
CREATE TABLE other_accreditation (id BIGSERIAL PRIMARY KEY, lab_id TEXT REFERENCES laboratory,
  body TEXT, standard TEXT, certificate_no TEXT, valid_to DATE, source TEXT, verified BOOLEAN DEFAULT false); -- [E]

-- ---------------------------------------------------------------- users, workflow, audit
CREATE TABLE app_user (user_id BIGSERIAL PRIMARY KEY, role TEXT NOT NULL CHECK (role IN ('citizen','laboratory','technical_officer','nabl_admin','regulator')),
  name TEXT, email TEXT UNIQUE, mobile TEXT, organisation TEXT, lab_id TEXT REFERENCES laboratory, regulator_code TEXT REFERENCES regulator,
  active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE officer_assignment (user_id BIGINT REFERENCES app_user, lab_id TEXT REFERENCES laboratory, PRIMARY KEY (user_id, lab_id));
CREATE TABLE change_request (
  request_id TEXT PRIMARY KEY, lab_id TEXT REFERENCES laboratory,
  kind TEXT CHECK (kind IN ('lab_correction','public_report','scope_update','service_update','location')),
  proposed JSONB NOT NULL DEFAULT '{}',        -- {field:{from,to}}; accreditation fields rejected unless kind='scope_update'
  reason TEXT, documents JSONB DEFAULT '[]',   -- object-storage keys
  status cr_status NOT NULL DEFAULT 'Draft', submitted_by BIGINT REFERENCES app_user, assigned_to BIGINT REFERENCES app_user,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE change_request_event (id BIGSERIAL PRIMARY KEY, request_id TEXT REFERENCES change_request,
  from_status cr_status, to_status cr_status NOT NULL, actor BIGINT REFERENCES app_user, comment TEXT, at TIMESTAMPTZ DEFAULT now());
CREATE TABLE audit_log (id BIGSERIAL PRIMARY KEY, entity TEXT NOT NULL, entity_id TEXT NOT NULL, action TEXT NOT NULL,
  before JSONB, after JSONB, actor BIGINT REFERENCES app_user, request_id TEXT REFERENCES change_request, at TIMESTAMPTZ DEFAULT now());
CREATE TABLE import_batch (batch_id BIGSERIAL PRIMARY KEY, file_name TEXT, template TEXT, column_mapping JSONB,
  rows_total INT, rows_valid INT, rows_error INT, duplicates INT, missing_coordinates INT, error_file_key TEXT,
  status TEXT CHECK (status IN ('validated','applied','discarded')), uploaded_by BIGINT REFERENCES app_user, at TIMESTAMPTZ DEFAULT now());
CREATE TABLE import_row (batch_id BIGINT REFERENCES import_batch, sheet TEXT, row_no INT, lab_id TEXT, raw JSONB, issues JSONB, PRIMARY KEY (batch_id, sheet, row_no));
CREATE TABLE search_event (id BIGSERIAL PRIMARY KEY, query TEXT, parsed JSONB, filters JSONB, result_count INT,
  exact_scope_count INT, state TEXT, city TEXT, at TIMESTAMPTZ DEFAULT now());   -- zero-result insight = result_count=0 / exact_scope_count=0

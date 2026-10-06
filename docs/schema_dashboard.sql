-- =====================================================================
-- NABL authenticated module — regulator mapping + row-level security (PostgreSQL 16)
-- Extends schema.sql. The prototype simulates these rules in the browser;
-- in production they MUST be enforced here and in the API, not in the UI.
-- =====================================================================
CREATE TYPE app_role     AS ENUM ('public','nabl_admin','regulator','nabl_board');
CREATE TYPE reg_level    AS ENUM ('Central','State','Sectoral');
CREATE TYPE rel_type     AS ENUM ('Primary','Recognised');
CREATE TYPE recog_status AS ENUM ('Active','In process','Expired / suspended','Withdrawn');
CREATE TYPE verif_status AS ENUM ('Verified','Source-listed','Pending');
CREATE TYPE visibility   AS ENUM ('Public','Shared','Internal');

-- Regulator master
CREATE TABLE regulator (
  regulator_id  SERIAL PRIMARY KEY,
  code          TEXT UNIQUE NOT NULL,            -- FSSAI, EIC, APEDA, TEA BOARD ...
  name          TEXT NOT NULL,
  regulator_type TEXT,                           -- statutory authority, export council ...
  level         reg_level NOT NULL,              -- Central / State / Sectoral
  status        TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
  contact_person TEXT, email TEXT, phone TEXT
);

-- Lab–regulator mapping. One PRIMARY per laboratory, any number of RECOGNISED.
CREATE TABLE lab_regulator (
  lab_id        TEXT NOT NULL REFERENCES laboratory,
  regulator_id  INT  NOT NULL REFERENCES regulator,
  relationship  rel_type NOT NULL,
  recognition   recog_status NOT NULL DEFAULT 'Active',
  valid_text    TEXT, valid_from DATE, valid_to DATE,
  verification  verif_status NOT NULL DEFAULT 'Pending',
  visibility    visibility NOT NULL DEFAULT 'Public',
  internal_note TEXT,                            -- visible only to that regulator + NABL admin
  source        TEXT, verified_by BIGINT REFERENCES app_user, verified_at TIMESTAMPTZ,
  PRIMARY KEY (lab_id, regulator_id)
);
CREATE UNIQUE INDEX one_primary_per_lab ON lab_regulator (lab_id) WHERE relationship='Primary' AND recognition<>'Withdrawn';

-- Users: a regulator user is bound to exactly one regulator.
ALTER TABLE app_user
  ADD COLUMN app_role app_role NOT NULL DEFAULT 'public',
  ADD COLUMN regulator_id INT REFERENCES regulator,
  ADD CONSTRAINT regulator_user_has_regulator CHECK ((app_role='regulator') = (regulator_id IS NOT NULL));

-- The API sets these per request from the verified session (never from request parameters):
--   SET LOCAL app.role = 'regulator'; SET LOCAL app.regulator_id = '3';
CREATE FUNCTION app_role_now() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('app.role', true) $$;
CREATE FUNCTION app_reg_now()  RETURNS int  LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.regulator_id', true),'')::int $$;

ALTER TABLE lab_regulator ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_regulator FORCE  ROW LEVEL SECURITY;

-- NABL admin: everything.
CREATE POLICY lr_admin ON lab_regulator FOR ALL USING (app_role_now()='nabl_admin') WITH CHECK (app_role_now()='nabl_admin');
-- Regulator: only its own rows (all columns, incl. its internal note).
CREATE POLICY lr_regulator_own ON lab_regulator FOR SELECT USING (app_role_now()='regulator' AND regulator_id = app_reg_now());
-- Regulator may edit only the note on its own rows (enforced through a function, not direct UPDATE).
-- Other regulators' rows for the same lab are exposed ONLY through the tag view below.

-- Shared tag view for labs the caller is related to: verified, Public/Shared rows of OTHER regulators; no note, validity or verifier.
CREATE VIEW v_lab_regulator_tags AS
  SELECT o.lab_id, r.code AS regulator_code, o.relationship
  FROM lab_regulator o JOIN regulator r USING (regulator_id)
  WHERE o.recognition<>'Withdrawn' AND o.verification IN ('Verified','Source-listed') AND o.visibility IN ('Public','Shared')
    AND (app_role_now()='nabl_admin'
         OR (app_role_now()='regulator' AND o.regulator_id <> app_reg_now()
             AND EXISTS (SELECT 1 FROM lab_regulator m WHERE m.lab_id=o.lab_id AND m.regulator_id=app_reg_now() AND m.recognition<>'Withdrawn')));

-- Laboratories a regulator may open: any lab it holds a live relationship with.
CREATE VIEW v_regulator_labs AS
  SELECT l.*, m.relationship AS my_relationship, m.recognition AS my_recognition, m.verification AS my_verification, m.internal_note AS my_note
  FROM laboratory l JOIN lab_regulator m USING (lab_id)
  WHERE app_role_now()='regulator' AND m.regulator_id=app_reg_now() AND m.recognition<>'Withdrawn';
-- The 'shared' projection (recognised-only labs) must be a narrower view exposing: id, name, type, city, state, certificate,
-- validity, status, disciplines — and NOT contacts, accreditation-cycle notes or other regulators' rows.

-- Public site: verified + Public tags only.
CREATE VIEW v_public_regulator_tags AS
  SELECT o.lab_id, r.code AS regulator_code, o.relationship
  FROM lab_regulator o JOIN regulator r USING (regulator_id)
  WHERE o.recognition<>'Withdrawn' AND o.verification IN ('Verified','Source-listed') AND o.visibility='Public';

-- Board: aggregates only. No SELECT on laboratory-level tables is granted to the board database role.
CREATE MATERIALIZED VIEW mv_board_kpis AS
  SELECT l.laboratory_type, l.state, a.status, date_trunc('quarter', a.valid_to) AS expiry_q, date_trunc('quarter', a.valid_from) AS issue_q, count(*) AS labs
  FROM laboratory l JOIN accreditation a ON a.lab_id=l.lab_id AND a.is_current GROUP BY 1,2,3,4,5;
-- Growth needs history: snapshot monthly into kpi_snapshot(month, metric, dimension, value).
CREATE TABLE kpi_snapshot (month DATE, metric TEXT, dimension TEXT, value BIGINT, PRIMARY KEY (month, metric, dimension));

-- Audit: sign-in, export, mapping change, verification.
CREATE TABLE access_audit (id BIGSERIAL PRIMARY KEY, at TIMESTAMPTZ DEFAULT now(), user_id BIGINT, role app_role, regulator_id INT,
  action TEXT, resource TEXT, allowed BOOLEAN, detail JSONB);

-- Initialize schemas for DB-per-Service pattern
-- One PostgreSQL instance, 4 isolated schemas
CREATE SCHEMA IF NOT EXISTS auth;

CREATE SCHEMA IF NOT EXISTS document;

CREATE SCHEMA IF NOT EXISTS processing;

CREATE SCHEMA IF NOT EXISTS ai;

-- Grant all privileges on schemas to the postgres user
GRANT ALL ON SCHEMA auth TO postgres;

GRANT ALL ON SCHEMA document TO postgres;

GRANT ALL ON SCHEMA processing TO postgres;

GRANT ALL ON SCHEMA ai TO postgres;
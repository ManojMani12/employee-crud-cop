# Changelog

## 2026-09-22

### Security

- Removed hardcoded production database credentials from Spring Boot configuration.
- Added runtime `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` configuration with fail-fast validation.
- Added safe datasource failure and secret-redaction coverage.
- Documented local, test, and production database configuration.
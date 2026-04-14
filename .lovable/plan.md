

## Full PostgreSQL Database Backup

### What will happen
I'll generate a complete `.sql` dump of your database — schema (tables, indexes, constraints, functions, triggers, RLS policies) and all data — saved as a single downloadable file.

### Steps

1. **Check `psql`/`pg_dump` access** — verify the managed PG environment variables are available
2. **Run `pg_dump`** with `--no-owner --no-privileges --inserts` flags to produce a portable `.sql` file
3. **If `pg_dump` unavailable**, fall back to manually querying all tables and reconstructing CREATE TABLE + INSERT statements via SQL queries
4. **Save** to `/mnt/documents/fomo_full_backup_2026-04-14.sql`
5. **Deliver** as a downloadable artifact

### How to restore on your local machine
```bash
createdb fomo_local
psql -d fomo_local -f fomo_full_backup_2026-04-14.sql
```

### Safety
- Read-only operation — no data is modified or deleted
- Your live database continues running normally


import type { Client } from 'pg'

/**
 * Logical backup and restore (T34). Every public table is saved as rows, with the list of applied
 * migrations; a restore goes into a database already migrated to the same list (scripts/restore.mjs
 * runs `payload migrate` first). Independent of the Postgres version, unlike pg_dump (production is
 * on Neon's Postgres 18, local tools are 17). Images on Vercel Blob are not included.
 */

export type Dump = {
  version: 1
  createdAt: string
  source: string
  migrations: string[]
  tables: Record<string, { columns: string[]; jsonColumns: string[]; rows: unknown[][] }>
}

const quote = (name: string) => `"${name.replace(/"/g, '""')}"`

async function publicTables(client: Client): Promise<string[]> {
  const { rows } = await client.query<{ table_name: string }>(
    "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' and table_name <> 'payload_migrations' order by table_name",
  )
  return rows.map((r) => r.table_name)
}

async function appliedMigrations(client: Client): Promise<string[]> {
  const { rows } = await client.query<{ name: string }>("select name from payload_migrations where name <> 'dev' order by name")
  return rows.map((r) => r.name)
}

export async function dumpDatabase(client: Client, source: string): Promise<Dump> {
  const tables: Dump['tables'] = {}
  // One snapshot for the whole dump, so rows across tables are consistent.
  await client.query('begin isolation level repeatable read read only')
  try {
    for (const table of await publicTables(client)) {
      const cols = await client.query<{ column_name: string; data_type: string }>(
        "select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = $1 order by ordinal_position",
        [table],
      )
      const columns = cols.rows.map((c) => c.column_name)
      const jsonColumns = cols.rows.filter((c) => c.data_type === 'json' || c.data_type === 'jsonb').map((c) => c.column_name)
      const res = await client.query({ text: `select ${columns.map(quote).join(', ')} from ${quote(table)}`, rowMode: 'array' })
      tables[table] = { columns, jsonColumns, rows: res.rows as unknown[][] }
    }
    const migrations = await appliedMigrations(client)
    await client.query('commit')
    return { version: 1, createdAt: new Date().toISOString(), source, migrations, tables }
  } catch (err) {
    await client.query('rollback')
    throw err
  }
}

/** Replaces every public table's rows with the dump's, in one transaction, then resets id sequences. */
export async function restoreDatabase(client: Client, dump: Dump): Promise<void> {
  const target = await appliedMigrations(client)
  if (JSON.stringify(target) !== JSON.stringify(dump.migrations)) {
    throw new Error(`migrations differ: backup has ${dump.migrations.length}, target has ${target.length}; migrate the target to the same code first`)
  }
  const tables = await publicTables(client)
  await client.query('begin')
  try {
    // Foreign keys are checked by the source database already; load tables in any order.
    await client.query('set local session_replication_role = replica')
    await client.query(`truncate ${tables.map(quote).join(', ')} restart identity cascade`)
    for (const [table, { columns, jsonColumns, rows }] of Object.entries(dump.tables)) {
      if (!tables.includes(table)) throw new Error(`table ${table} from the backup does not exist in the target`)
      const json = new Set(jsonColumns.map((c) => columns.indexOf(c)))
      for (let i = 0; i < rows.length; i += 200) {
        const batch = rows.slice(i, i + 200)
        const values: unknown[] = []
        const tuples = batch.map((row) => {
          const params = row.map((v, j) => {
            values.push(json.has(j) && v !== null ? JSON.stringify(v) : v)
            return `$${values.length}`
          })
          return `(${params.join(', ')})`
        })
        await client.query(`insert into ${quote(table)} (${columns.map(quote).join(', ')}) values ${tuples.join(', ')}`, values)
      }
    }
    // Serial ids continue after the restored rows.
    const seqs = await client.query<{ table_name: string; column_name: string; seq: string }>(
      "select table_name, column_name, pg_get_serial_sequence(quote_ident(table_name), column_name) as seq from information_schema.columns where table_schema = 'public' and column_default like 'nextval(%'",
    )
    for (const { table_name, column_name, seq } of seqs.rows) {
      if (!seq) continue
      await client.query(
        `select setval($1, coalesce((select max(${quote(column_name)}) from ${quote(table_name)}), 0) + 1, false)`,
        [seq],
      )
    }
    await client.query('commit')
  } catch (err) {
    await client.query('rollback')
    throw err
  }
}

/** Rows per public table, to compare a backup with a restored copy. */
export async function rowCounts(client: Client): Promise<Record<string, number>> {
  const out: Record<string, number> = {}
  for (const table of await publicTables(client)) {
    const { rows } = await client.query<{ n: string }>(`select count(*) as n from ${quote(table)}`)
    out[table] = Number(rows[0]!.n)
  }
  return out
}

/** Row counts recorded in a dump (same shape as rowCounts). */
export const dumpCounts = (dump: Dump): Record<string, number> =>
  Object.fromEntries(Object.entries(dump.tables).map(([t, { rows }]) => [t, rows.length]))

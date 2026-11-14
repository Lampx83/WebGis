import type postgres from "postgres"

type Sql = postgres.Sql
type Tx = postgres.TransactionSql

export const RAW_RETENTION_DAYS = 30
export const HOURLY_RETENTION_DAYS = 365

/** Delete data older than the retention policy and record what was removed. Caller owns the transaction. */
export async function deleteExpiredData(tx: Tx) {
  const day = 24 * 60 * 60 * 1000
  const rawCutoff = new Date(Date.now() - RAW_RETENTION_DAYS * day).toISOString()
  const hourlyCutoff = new Date(Date.now() - HOURLY_RETENTION_DAYS * day).toISOString()

  const env = await tx`DELETE FROM environmental_readings WHERE created_at < ${rawCutoff} RETURNING id`
  const water = await tx`DELETE FROM water_level_readings WHERE created_at < ${rawCutoff} RETURNING id`
  const camera = await tx`DELETE FROM camera_events WHERE created_at < ${rawCutoff} RETURNING id`
  const hourly = await tx`DELETE FROM readings_hourly WHERE hour_start < ${hourlyCutoff} RETURNING id`

  await tx`
    INSERT INTO data_archival_log (table_name, records_archived, archived_date, retention_days)
    VALUES
      ('environmental_readings', ${env.length}, NOW(), ${RAW_RETENTION_DAYS}),
      ('water_level_readings', ${water.length}, NOW(), ${RAW_RETENTION_DAYS}),
      ('camera_events', ${camera.length}, NOW(), ${RAW_RETENTION_DAYS}),
      ('readings_hourly', ${hourly.length}, NOW(), ${HOURLY_RETENTION_DAYS})
  `

  return {
    environmental_readings_deleted: env.length,
    water_level_readings_deleted: water.length,
    camera_events_deleted: camera.length,
    readings_hourly_deleted: hourly.length,
  }
}

export async function runRetentionCleanup(sql: Sql) {
  return (await sql.begin((tx) => deleteExpiredData(tx))) as unknown as Awaited<ReturnType<typeof deleteExpiredData>>
}

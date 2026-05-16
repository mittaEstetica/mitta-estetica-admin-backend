import { Pool } from 'pg'
const pool = new Pool({ connectionString: 'postgresql://postgres:Jf%25u%21d%26%244WgMknY@db.uctdgqyhphefpazmziwa.supabase.co:5432/postgres' })
pool.query("SELECT * FROM appointments WHERE package_id IN ('ade5a11c-81c0-4b14-a504-69ed27fa7610', '1be5c457-b016-4ced-b37f-43c6964db473')").then(res => console.log(res.rows)).catch(console.error).finally(() => pool.end())

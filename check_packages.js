import db from './src/database.js'

async function run() {
  const packages = await db.prepare('SELECT * FROM packages WHERE total_value = 1 OR paid_value = 1 OR session_value = 1').all()
  console.log(`Found ${packages.length} packages with value 1`)
  for (const pkg of packages) {
    console.log({
      id: pkg.id,
      name: pkg.name,
      total_value: pkg.total_value,
      paid_value: pkg.paid_value,
      session_value: pkg.session_value
    })
  }
  await db.end()
}

run().catch(console.error)

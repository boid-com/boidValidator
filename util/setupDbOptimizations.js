const db = require('../db')
function pq (query) {
  return query.replace(/"/g, '\\"').replace(/\n/g, ' ').replace(/\s+/g, ' ')
}
const queries = [
  'CREATE INDEX "wu_index" ON "default$default"."WorkUnit" USING BTREE ("deviceId")',
  'CREATE INDEX "sd_index" ON "default$default"."ShareData" USING BTREE ("deviceId")'
]

for (query of queries) {
  db.gql(`mutation{executeRaw(query:"${pq(query)}")}`).then(el => console.log('Index Setup')).catch(console.error)
}

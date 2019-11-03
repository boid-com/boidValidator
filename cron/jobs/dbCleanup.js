const db = require('../../db.js')
const logger = require('logging').default('dbCleanup')
const ms = require('human-interval')

async function init () {
  var lookback = require('../../.env').cleanupLookback
  if (!lookback) lookback = '4 weeks'
  const sinceTime = new Date(Date.now() - ms(lookback)).toISOString()
  logger.info('Deleting older than:', sinceTime)
  const results = {
    sinceTime,
    deletedShareDatas: (await db.gql(`mutation{deleteManyShareDatas(where:{time_lt:"${sinceTime}"}){count}}`)).count,
    deletedWorkUnits: (await db.gql(`mutation{deleteManyWorkUnits(where:{validatedAt_lt:"${sinceTime}"}){count}}`)).count,
    deletedPowerRatings: (await db.gql(`mutation{deleteManyPowerRatings(where:{createdAt_lt:"${sinceTime}"}){count}}`)).count
  }
  return { results }
}

module.exports = init
if (process.argv[2] === 'dev') init().catch(logger.error)

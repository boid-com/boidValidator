var ax = require('axios')
ax.defaults.timeout = 20000
const db = require('../../db.js')
const ms = require('human-interval')
const sleep = ms => new Promise(res => setTimeout(res, ms))
const saveUnit = require('./util/createWorkUnit.js')
const env = require('../../.env.json')
const logger = require('logging').default('getBoincWork')
var results = {
  updatedWU: 0,
  newWU: 0,
  totalWU: 0
}

var apiURL = 'https://www.worldcommunitygrid.org/api/members/boid.com/results?code=' + env.wcg.key
var apiParams = { Limit: 250, ValidateState: 1 }
var getData = async function (i, apiParams) {
  var offsetParams = Object.assign(apiParams, {})
  offsetParams.Offset = i
  var result = await ax.get(apiURL, { params: offsetParams }).catch(logger.error)
  result = result.data.ResultsStatus.Results
  if (result.length > 0) {
    return result
  } else return null
}

async function getAccount (apiParams) {
  var batchSize = 250
  var allData = []
  var i = 0
  var totalLength = await ax.get(apiURL, { params: apiParams }).catch(logger.error)
  totalLength = parseInt(totalLength.data.ResultsStatus.ResultsAvailable)
  async function loop (apiParams) {
    logger.info('')
    logger.info('Completed', i, 'of', totalLength, 'WUs')
    var data = await getData(i, apiParams).catch(logger.error)
    if (!data) return
    logger.info('Downloaded', data.length, 'WUs from WCG')
    logger.info('Writing WUs to DB')
    await updateUnits(data).catch(logger.error)
    data.forEach((el) => { allData.push(el) })
    i += batchSize
    logger.info('sleeping 1 second')
    await sleep(ms('1 second'))
    await loop(apiParams)
  }
  await loop(apiParams).catch(logger.error)
  // logger.info('\n')
  return allData
}

async function updateUnits (workUnits) {
  for (var unit of workUnits) {
    logger.debug(unit)
    const existing = await db.gql(`{workUnit(where:{workUnitId:${parseInt(unit.WorkunitId)}}){id validatedAt}}`)
    if (existing) results.updatedWU++
    else results.newWU++
    if ((unit.ValidateState === 1 && !existing) || (existing && !existing.validatedAt)) unit.validatedAt = new Date().toISOString()
    if (unit.ReportDeadline) unit.ReportDeadline = new Date(Date.parse(unit.ReportDeadline)).toISOString()
    if (unit.SentTime) unit.SentTime = new Date(Date.parse(unit.SentTime)).toISOString()
    if (unit.ReceivedTime) unit.ReceivedTime = new Date(Date.parse(unit.ReceivedTime)).toISOString()
    unit.device = await db.gql(`{device(where:{wcgid:"${unit.DeviceId}"}){id}}`)
    const result = await db.gql(saveUnit(unit), unit).catch((error) => { logger.error(error) })
    logger.debug(result)
  }
}

async function init () {
  logger.info('get BOINC Work Units')
  try {
    let ModTime
    const lastRun = (await db.gql(`{ cronRuns( last:1 where: {runtime_not:null job: { name: "getBoincWork" } }) {
      errors runtime createdAt } }`))[0]
    if (!lastRun || lastRun.errors.length > 0) ModTime = Date.now() - ms('2 days')
    else ModTime = (Date.parse(lastRun.createdAt)) - ms(env.wcg.queryRedundancy)
    results.queryUpdatedSince = new Date(ModTime).toLocaleString()
    logger.info('')
    logger.info('Getting WU since:', results.queryUpdatedSince)
    ModTime = parseInt(ModTime / 1000)
    await getAccount(Object.assign(apiParams, { ModTime }))
    results.queryFinished = new Date().toLocaleString()
    results.totalWU = results.updatedWU + results.newWU
    results.queryTimeLength = Date.parse(results.queryFinished) - Date.parse(results.queryUpdatedSince)
    results.newWUHourly = results.newWU * (36000000 / results.queryTimeLength)
    logger.info('')
    logger.info('getBoincWork has finished!')
    return { errors: [], results }
  } catch (error) {
    logger.error(error)
    return { errors: [error.message] }
  }
  return
}
module.exports = init
if (require.main === module && process.argv[2] === 'dev') init().catch(logger.info)

// init()
// const ModTime = (Date.now() - ms('one hour'))/1000
// logger.info(ModTime)

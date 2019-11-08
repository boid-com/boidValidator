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
var errors = []
function eH (error) {
  logger.error(error)
  errors.push(error.toString())
}
var apiParams = { Limit: 250, ValidateState: 1 }
var apiURL = 'https://www.worldcommunitygrid.org/api/members/boid.com/results?code=' + env.wcg.key

var getData = async function (i, apiParams) {
  try {
    var offsetParams = Object.assign(apiParams, {})
    offsetParams.Offset = i
    var result = await ax.get(apiURL, { params: offsetParams })
    result = result.data.ResultsStatus.Results
    if (result.length > 0) {
      return result
    } else return null
  } catch (error) {
    eH(error)
    return null
  }
}

async function getAccount (apiParams) {
  try {
    var batchSize = 250
    var allData = []
    var i = 0
    var totalLength = await ax.get(apiURL, { params: apiParams })
    totalLength = parseInt(totalLength.data.ResultsStatus.ResultsAvailable)
    async function loop (apiParams) {
      logger.info('')
      logger.info('Completed', i, 'of', totalLength, 'WUs')
      var data = await getData(i, apiParams)
      if (!data) return
      logger.info('Downloaded', data.length, 'WUs from WCG')
      logger.info('Writing WUs to DB')
      await updateUnits(data)
      data.forEach((el) => { allData.push(el) })
      i += batchSize
      logger.info('sleeping 1 second')
      await sleep(ms('1 second'))
      await loop(apiParams)
    }
    await loop(apiParams)
    // logger.info('\n')
    return allData
  } catch (error) {
    eH(error)
    return null
  }
}

async function updateUnits (workUnits) {
  for (var unit of workUnits) {
    try {
      logger.debug(unit)
      const existing = await db.gql(`{workUnit(where:{workUnitId:${parseInt(unit.WorkunitId)}}){id validatedAt}}`)
      if (existing) results.updatedWU++
      else results.newWU++
      if ((unit.ValidateState === 1 && !existing) || (existing && !existing.validatedAt)) unit.validatedAt = new Date().toISOString()
      if (unit.ReportDeadline) unit.ReportDeadline = new Date(Date.parse(unit.ReportDeadline)).toISOString()
      if (unit.SentTime) unit.SentTime = new Date(Date.parse(unit.SentTime)).toISOString()
      if (unit.ReceivedTime) unit.ReceivedTime = new Date(Date.parse(unit.ReceivedTime)).toISOString()
      unit.device = await db.gql(`{device(where:{wcgid:"${unit.DeviceId}"}){id}}`)
      const result = await db.gql(saveUnit(unit), unit)
      logger.debug(result)
    } catch (error) {
      eH(error)
      continue
    }
  }
}

async function init () {
  try {
    logger.info('get BOINC Work Units')
    let ModTime
    const lastRun = (await db.gql(`{ cronRuns( last:1 where: {runtime_not:null job: { name: "getBoincWork" } }) {
      errors runtime createdAt results } }`))[0]
    if (!lastRun || lastRun.errors.length > 0 || !lastRun.results) ModTime = Date.now() - ms('2 days')
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
    return { errors, results }
  } catch (error) {
    eH(error)
    return { errors }
  }
}
module.exports = init
if (require.main === module && process.argv[2] === 'dev') init().catch(logger.info)
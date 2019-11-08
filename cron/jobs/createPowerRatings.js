const db = require('../../db.js')
const env = require('../../.env')
const batchSize = env.powerRatingBatchSize
const logger = require('logging').default('createPowerRatings')
const reportDevicePowers = require('./util/reportDevicePowers')
const getWCGPower = require('./util/getWCGPower')
const getRVNPower = require('./util/getRVNPower')
const ms = require('human-interval')
const sleep = ms => new Promise(res => setTimeout(res, ms))

function chunk (arr, len) {
  var chunks = []
  var i = 0
  var n = arr.length
  while (i < n) { chunks.push(arr.slice(i, i += len)) }
  return chunks
}
var errors = []

async function getGlobals () {
  var now = new Date()
  now.setUTCMinutes(0, 0, 0)
  now.setUTCHours(0)
  console.log(Date.parse(now))
  var round = {}
  round.end = now.toISOString()
  round.start = new Date(Date.parse(round.end) - ms('24 hours')).toISOString()
  logger.info('Current Round:', JSON.stringify(round, null, 2))
  const existingRound = (await db.gql(`{powerRounds(where:{start:"${round.start}" end:"${round.end}"}){id}}`))[0]
  if (!existingRound) round.id = (await db.gql(`mutation{createPowerRound(data:{start:"${round.start}" end:"${round.end}"}){id}}`)).id
  else round.id = existingRound.id
  const protocolsArr = await db.gql('{protocols{name difficulty meta type}}')
  var protocols = {}
  protocolsArr.forEach(el => { protocols[el.name] = el })
  return { round, protocols }
}
async function getProtocolDevicePowers (protocolName, globals) {
  try {
    var allReports = []
    const protocolDevices = (await db.gql(`{devices(
      where:{protocol:{name:"${protocolName}"}}){ key wcgid rvnid owner 
        powerRatings(first:1 where:{
          round:{start:"${globals.round.start}" end:"${globals.round.end}" }}){id}}}`))
      .filter(el => !el.powerRatings[0])
    logger.info("Found Protocol Devices without Rating for this round:",protocolDevices.length)

    const deviceChunks = chunk(protocolDevices.shuffle(), batchSize)
    var makePowerReports
    if (protocolName === 'rvn') makePowerReports = getRVNPower
    else if (protocolName === 'wcg') makePowerReports = getWCGPower
    // console.log(deviceChunks)
    for (var iChunk of deviceChunks) {
      // console.log('Chunk')
      const powerReports = await makePowerReports(iChunk, globals)
      allReports.push(reportDevicePowers(powerReports.filter(el => el.power > 0), globals))
    }
    const reportsList = (await Promise.all(allReports)).filter(el => el)
    logger.info('Finished all reports for ', protocolName)
    return { protocolName, reportsList }
  } catch (error) {
    logger.error(error)
    return { errors: [error] }
  }
}

async function init () {
  try {
    var globals = await getGlobals()
    const finished = await Promise.all(Object.keys(globals.protocols).map(el => getProtocolDevicePowers(el, globals)))
    logger.info(finished)
    return { results: finished, errors }
  } catch (error) {
    errors.push(error)
    if (!error.message) error = { message: error }
    logger.error(error.message)
    return { errors }
  }
}
if (process.argv[2] === 'dev') init().catch(logger.error)

module.exports = init

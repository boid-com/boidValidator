const db = require('../../db.js')
const getRvnPower = require('./util/getRvnPower')
const getBoincPower = require('./util/getBoincPower')
const env = require('../../.env')
const reflect = p => p.then(data => ({ data, status: 'fulfilled' }), e => ({ e, status: 'rejected' }))
const ax = require('axios')
const logger = require('logging').default('devicePowerRatings')
const reportDevicePowers = require('./util/reportDevicePowers')
const ms = require('human-interval')
ax.defaults.timeout = 20000
Array.prototype.shuffle = function () {
  var i = this.length; var j; var temp
  if (i == 0) return this
  while (--i) {
    j = Math.floor(Math.random() * (i + 1))
    temp = this[i]
    this[i] = this[j]
    this[j] = temp
  }
  return this
}

var globals
var errors = []

async function setupGlobals () {
  var now = new Date()
  now.setUTCMinutes(0, 0, 0)
  globals = {}
  globals.protocols = {}

  var protocols = await db.gql('{protocols{ name type difficulty meta }}')
  protocols.forEach(el => globals.protocols[el.name] = el)
  globals.round = {}
  globals.round.end = now.toISOString()
  globals.round.start = new Date(Date.parse(globals.round.end) - ms('one hour')).toISOString()
  logger.info('Got Globals:', JSON.stringify(globals, null, 2))
}

async function init () {
  try {
    await setupGlobals()
    var deviceList = await db.gql('{devices{ name protocol {name type}}}')
    // console.log(deviceList)
    const results = await generatePowerReports(deviceList.shuffle().filter(el => el))
    return { results, errors }
  } catch (error) {
    errors.push(error)
    if (!error.message) error = { message: error }
    logger.error(error.message)
    return { errors }
  }

  async function generatePowerReports (devices) {
    const allResults = await Promise.all([
      reflect(getBoincPower(devices.filter(el => el.protocol.name === 'wcg'), globals)),
      reflect(getRvnPower(devices.filter(el => el.protocol.name === 'rvn'), globals))
    ])
    var boincPowerRatings = allResults[0].data
    var rvnPowerRatings = allResults[1].data
  }

  // var boincPowerRatings = {}
  // var rvnPowerRatings = {}
  var boincPowerRatings = allResults[0].data
  var rvnPowerRatings = allResults[1].data
  // logger.info('RESULTS:',boincPowerRatings,rvnPowerRatings)
  var powerReports = []
  for (device of devices) {
    try {
      var result = Object.assign(
        { id: device.id, rvnPower: 0, boincPower: 0, boincPending: 0 },
        rvnPowerRatings[device.id],
        boincPowerRatings[device.id])
      result.totalPower = result.rvnPower + result.boincPower
      result.rvnid = device.rvnid
      result.wcgid = device.wcgid
      if (result.totalPower === 0) continue
      else powerReports.push(result)
    } catch (error) {
      logger.error('Error in device parsing!')
      logger.error(error)
      continue
    }
  }

  var results = { updatedDevices: 0, totalBoincPower: 0, totalBoincPending: 0, totalRvnPower: 0, boincDevices: 0, rvnDevices: 0 }
  if (powerReports.length != 0) {
    logger.info('Saving and reporting Power Ratings for this chunk.')
    for (device of powerReports) {
      try {
        const powerRating = await db.gql(`mutation{
          createDevicePowerRating(
            data:{
              power:${device.totalPower} 
              boincPower:${device.boincPower} 
              rvnPower:${device.rvnPower} 
              roundTime:"${globals.round.end}"
              device:{connect:{id:"${device.id}"}}}){id}
          updateDevice(
            where:{id:"${device.id}"} data:{
              power:${device.totalPower} 
              boincPower:${device.boincPower} 
              rvnPower:${device.rvnPower} 
            }){id}
          }`)
        if (powerRating) {
          results.updatedDevices++
          if (device.boincPower > 0) results.boincDevices++
          if (device.rvnPower > 0) results.rvnDevices++
          results.totalBoincPower += device.boincPower
          results.totalRvnPower += device.rvnPower
          // logger.info(powerRating)
        }
      } catch (error) {
        logger.info(error)
        errors.push(error)
        continue
      }
    }
    const reportData = { powerReports, globals }
    console.log(JSON.stringify(reportData))
    reportDevicePowers(reportData)
    logger.info(globals, JSON.stringify(results, null, 2), errors)
    logger.info('finished creating power ratings')
  } else logger.info('No power to report in this batch.')
  return { results, errors }
}
if (process.argv[2] === 'dev') init().catch(logger.error)

module.exports = init

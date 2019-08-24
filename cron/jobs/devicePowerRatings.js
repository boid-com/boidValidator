const moment = require('moment')
const db = require('../../db.js')
const getRvnPower = require('./util/getRvnPower')
const getBoincPower = require('./util/getBoincPower')
const env = require('../../.env')
const reflect = p => p.then(v => ({v, status: "fulfilled" }),e => ({e, status: "rejected" }))
const ax = require('axios')
const logger = require('logging').default('devicePowerRatings')
const reportDevicePowers = require('./util/reportDevicePowers')
Array.prototype.shuffle = function() {
  var i = this.length, j, temp;
  if ( i == 0 ) return this;
  while ( --i ) {
     j = Math.floor( Math.random() * ( i + 1 ) );
     temp = this[i];
     this[i] = this[j];
     this[j] = temp;
  }
  return this;
}
function chunk (arr, len) {
  var chunks = []
  var i = 0
  var n = arr.length
  while (i < n) {chunks.push(arr.slice(i, i += len))}
  return chunks
}
function round(date, duration, method) {
  return moment(Math[method]((+date) / (+duration)) * (+duration)); 
}
var globals

async function init(devices) {
  try {
    if (!devices){
      globals = (await ax.post(env.boidAPI + 'getGlobals')).data
      globals.round = {}
      globals.round.end = new Date(round(moment(), moment.duration(1, "hour"), "floor"))
      globals.round.start = new Date(globals.round.end - globals.roundLength)
      logger.info('Got Globals:',JSON.stringify(globals,null,2))
      var deviceList = await db.gql(`{
        devices{id wcgid createdAt workUnits(last:1){id} rvnShares(last:1){time}}}`)
      const chunks = chunk(deviceList.shuffle(),1).filter(el => el)
      logger.info('Split devices into Chunks:',chunks.length)
      const results = []
      for(chunk of chunks){
        logger.info('Chunk Length:',chunk.length)
        const result = await init(chunk)
        results.push(result)
      }
      // logger.info(results)
      const finalResults = {updatedDevices:0,totalBoincPower:0,totalBoincPending:0, totalRvnPower:0,boincDevices:0,rvnDevices:0}
      for (result of results ) {
        Object.keys(result.results).forEach( el => finalResults[el] += result.results[el])
      }
      // logger.info(finalResults)
      return {results:finalResults}
    } 
  } catch (error) {
    logger.info(error.message)
    return {errors:[error]}
  }

  logger.info('Updating Power for Devices:', devices.length)
  
  const allResults = await Promise.all([
    reflect(getBoincPower(devices.filter(el => el.workUnits[0]),globals)),
    // reflect(getRvnPower(devices.filter(el => el.rvnShares[0]),globals))
  ])
  // var boincPowerRatings = {}
  var rvnPowerRatings = {}
  var boincPowerRatings = allResults[0].v
  // var rvnPowerRatings = allResults[1].v
  // logger.info('RESULTS:',boincPowerRatings,rvnPowerRatings)
  var parsedDevices = []
  for (device of devices){
    var result = Object.assign({id:device.id,rvnPower:0,boincPower:0,boincPending:0},
      rvnPowerRatings[device.id],
      boincPowerRatings[device.id])
    result.totalPower = result.rvnPower + result.boincPower
    if (result.totalPower === 0) continue
    else parsedDevices.push(result) 
  }
  var errors = []
  var results = {updatedDevices:0,totalBoincPower:0,totalBoincPending:0, totalRvnPower:0,boincDevices:0,rvnDevices:0}
  logger.info('Saving and reporting Power Ratings for this round.')
  for (device of parsedDevices){
    try {
      const powerRating = await db.gql(`mutation{
        createDevicePowerRating(
          data:{
            power:${device.totalPower} 
            boincPower:${device.boincPower} 
            rvnPower:${device.rvnPower} 
            roundTime:"${globals.round.end.toISOString()}"
            device:{connect:{id:"${device.id}"}}}){id}
        updateDevice(
          where:{id:"${device.id}"} data:{
            power:${device.totalPower} 
            boincPower:${device.boincPower} 
            rvnPower:${device.rvnPower} 
          }){id}
        }`)
      if (powerRating) {
        results.updatedDevices ++
        if (device.boincPower > 0) results.boincDevices ++
        if (device.rvnPower > 0) results.rvnDevices ++
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
  logger.info(JSON.stringify(parsedDevices),JSON.stringify(globals))
  // reportDevicePowers(parsedDevices,globals)
  logger.info(globals,JSON.stringify(results,null,2),errors)
  logger.info('finished creating power ratings')
  return {results,errors}

}
if (process.argv[2] === 'dev') init().catch(logger.error)

module.exports = init

const moment = require('moment')
const db = require('../../db.js')
const getRvnPower = require('./util/getRvnPower')
const getBoincPower = require('./util/getBoincPower')
const env = require('../../.env')
const reflect = p => p.then(v => ({v, status: "fulfilled" }),e => ({e, status: "rejected" }))
const ax = require('axios')

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
      console.log('Got Globals:',globals)
      var deviceList = await db.gql(`{devices
      {id wcgid createdAt rvnShares(last:1){time}}}`)
      const chunks = chunk(deviceList.shuffle(),10).filter(el => el)
      console.log('Split devices into Chunks:',chunks.length)
      const results = []
      for(chunk of chunks){
        console.log('Chunk Length:',chunk.length)
        const result = await init(chunk)
        results.push(result)
      }
      console.log(results)
      const finalResults = {updatedDevices:0,totalBoincPower:0,totalBoincPending:0, totalRvnPower:0,boincDevices:0,rvnDevices:0}
      for (result of results ) {
        Object.keys(result.results).forEach( el => finalResults[el] += result.results[el])
      }
      console.log(finalResults)
      return {results:finalResults}
    } 
  } catch (error) {
    console.log(error.message)
    return {errors:[error]}
  }

  console.log('Updating Power for Devices:', devices.length)
  
  const allResults = await Promise.all([
    reflect(getBoincPower(devices.filter(el => el.wcgid),globals)),
    // reflect(getRvnPower(devices.filter(el => el.rvnShares[0]),globals))
  ])
  // var boincPowerRatings = {}
  var rvnPowerRatings = {}
  var boincPowerRatings = allResults[0].v
  // var rvnPowerRatings = allResults[1].v
  console.log('RESULTS:',boincPowerRatings,rvnPowerRatings)
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
        results.totalBoincPending += device.boincPending
        results.totalRvnPower += device.rvnPower
        // console.log(powerRating)
      }
    } catch (error) {
      console.log(error)
      errors.push(error)
      continue
    }
  }  
 

  console.log('finished creating power ratings: ', results.updatedDevices)
  console.log(results,errors)
  return {results,errors}

}
if (process.argv[2] === 'dev') init().catch(console.log)

module.exports = init

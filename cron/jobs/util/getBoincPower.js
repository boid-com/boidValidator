const db = require('../../../db.js')
var ms = require('human-interval')
const logger = require('logging').default('getBoincPower')

async function parseUnits(workUnits, deviceId, globals) {
  var results = []
  var mutations = []
  for (unit of workUnits) {
    unit.power = 0
    unit.pending = 0
    if (unit.serverState === 5 && unit.outcome === 1 && unit.validateState === 1) {
      if ( !unit.grantedCredit > 0) continue
      unit.power = unit.grantedCredit / globals.wcgDifficulty
    }
    results.push(unit)
    mutations.push({cmd:`mutation{updateworkUnit(where:{workUnitId:${unit.workUnitId}} 
      data:{power:${unit.power} device:{connect:{id:"${deviceId}"}}}){deviceId}}`,vars:null})
  }
  db.doMany(mutations)
  return results
}

async function boincFindPower(devices,globals) {
  var i = 0
  var powerRatings = {}
  logger.info('num Boinc devices',devices.length)
  for (var device of devices) {
    try {
      const deviceID = parseInt(device.wcgid)
      var workUnits = (await db.gql(`query($roundStart:DateTime $roundEnd:DateTime)
      {workUnits(where:{deviceId:${deviceID} receivedTime_gt:$roundStart receivedTime_lt:$roundEnd})
      {id receivedTime grantedCredit claimedCredit serverState validateState outcome deviceId workUnitId power}}`, 
      {roundStart:globals.round.start, roundEnd:globals.round.end}))
      if (!workUnits[0]) {
        // logger.info('No Device WU found for this round')
        continue
      }
      logger.info('Getting Device WU',deviceID)
      logger.info('Found WorkUnits for this round:#:',workUnits.length)
      const parsedUnits = await parseUnits(workUnits, device.id, globals)
      logger.info('')
      const boincPower = parsedUnits
        .filter(el => (el.outcome === 1 && el.validateState === 1))
        .reduce((a, el) => a + el.power, 0)
      if (boincPower === 0) continue
      powerRatings[device.id] = {boincPower}
    } catch (error) {
      logger.error(error)
      continue
    }
  }
  logger.info('getBoincPower has finished!')
  return powerRatings
}

module.exports = boincFindPower
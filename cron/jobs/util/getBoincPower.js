const db = require('../../../db.js')
var ms = require('human-interval')

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
  console.log('num Boinc devices',devices.length)
  for (var device of devices) {
    try {
      const deviceID = parseInt(device.wcgid)
      var workUnits = (await db.gql(`query($roundStart:DateTime){workUnits( where:{deviceId:${deviceID} receivedTime_gt:$roundStart}
      ){id receivedTime grantedCredit claimedCredit serverState validateState outcome deviceId workUnitId power}}`, 
      {roundStart:globals.round.start}))
      if (!workUnits[0]) {
        // console.log('Device has no WUs',deviceID)
        continue
      }
      console.log('WorkUnits#:',workUnits.length)
      const parsedUnits = await parseUnits(workUnits, device.id, globals)
      console.log('')
      const boincPower = parsedUnits
        .filter(el => (el.outcome === 1 && el.validateState === 1))
        .reduce((a, el) => a + el.power, 0)
      if (boincPower === 0) continue
      powerRatings[device.id] = {boincPower,boincPending}
    } catch (error) {
      console.error(error)
      continue
    }
  }
  return powerRatings
}

module.exports = boincFindPower
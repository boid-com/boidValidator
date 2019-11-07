const db = require('../../../db.js')
var ms = require('human-interval')
const logger = require('logging').default('getWCGPower')

async function parseUnits (workUnits, deviceId, globals) {
  var results = []
  var mutations = []
  for (var unit of workUnits) {
    unit.power = 0
    unit.pending = 0
    if (unit.serverState === 5 && unit.outcome === 1 && unit.validateState === 1) {
      if (!unit.grantedCredit > 0) continue
      unit.power = unit.grantedCredit / globals.protocols.wcg.difficulty
    }
    results.push(unit)
    mutations.push({
      cmd: `mutation{updateWorkUnit(where:{workUnitId:${unit.workUnitId}} 
      data:{power:${unit.power} device:{connect:{id:"${deviceId}"}}}){deviceId}}`,
      vars: null
    })
  }
  // db.doMany(mutations)
  return results
}

async function handleDevice (device, globals) {
  const deviceID = parseInt(device.wcgid)
  var workUnits = (await db.gql(`query($roundStart:DateTime $roundEnd:DateTime)
  {workUnits(where:{deviceId:${deviceID} validatedAt_gt:$roundStart validatedAt_lt:$roundEnd})
  {id receivedTime grantedCredit claimedCredit serverState validateState outcome deviceId workUnitId power}}`,
  { roundStart: globals.round.start, roundEnd: globals.round.end }))
  if (!workUnits[0]) return {}
  // logger.info('Getting Device WU', deviceID)
  // logger.info('Found WorkUnits:', workUnits.length)
  const parsedUnits = await parseUnits(workUnits, device.id, globals)
  // logger.info('')
  const power = parsedUnits.reduce((a, el) => a + el.power, 0)
  return { power, units: parsedUnits.length, key: device.key, protocolType: globals.protocols.wcg.type, owner: device.owner }
}

async function boincFindPower (devices, globals) {
  try {
    logger.info('got wcg devices', devices.length)
    if (!globals.protocols.wcg) return
    const powerRatings = await Promise.all(devices.map(device => handleDevice(device, globals)))
    return powerRatings
  } catch (error) {
    logger.error(error)
    return []
  }
}

module.exports = boincFindPower

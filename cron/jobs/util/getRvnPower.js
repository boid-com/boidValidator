const db = require('../../../db.js')
const logger = require('logging').default('getRvnPower')

async function rvnFindPower (devices, globals) {
  try {
    logger.info('got rvn devices', devices.length)
    if (!globals.rvnDifficulty) throw ('rvn globals not defined')
  } catch (error) {
    logger.error(error)
    return {}
  }
  var powerRatings = {}

  for (device of devices) {
    try {
      const roundStart = globals.round.start
      const roundEnd = globals.round.end
      const rvnShares = await db.gql(`query($roundStart:DateTime $roundEnd:DateTime){
        shareDatas( where:{deviceId:"${device.rvnid}" valid:true time_gt:$roundStart time_lt:$roundEnd })
          {time valid difficulty shareDifficulty shareHash}}`, { roundStart, roundEnd })
      if (!rvnShares || rvnShares.length == 0) continue
      logger.info('#Shares', rvnShares.length)
      var mutations = []
      for (share of rvnShares) {
        share.power = share.difficulty / globals.rvnDifficulty
        if (Math.sign(share.power) < 0) share.power = 0
        mutations.push({
          cmd: `mutation{updateshareData(
            where: { shareHash: "${share.shareHash}" }
            data: { weight: ${share.weight}, power: ${share.power} }
          ) {shareHash}}`,
          vars: null
        })
      }
      // db.doMany(mutations)
      const rvnPower = rvnShares.reduce((acc, el) => acc + el.power, 0)
      powerRatings[device.id] = { rvnPower }
    } catch (error) {
      logger.error(error)
      continue
    }
  }
  return powerRatings
}

module.exports = rvnFindPower

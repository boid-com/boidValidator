const db = require('../../../db.js')
const logger = require('logging').default('getRvnPower')


async function handleDevice (device,globals) {
  const roundStart = globals.round.start
  const roundEnd = globals.round.end
  const rvnShares = await db.gql(`query($roundStart:DateTime $roundEnd:DateTime){
    shareDatas( where:{deviceId:"${device.rvnid}" valid:true time_gt:$roundStart time_lt:$roundEnd })
      {time valid difficulty shareDifficulty shareHash}}`, { roundStart, roundEnd })
  if (!rvnShares || rvnShares.length == 0) return
  logger.info('#Shares', rvnShares.length)
  var mutations = []
  const parsedShares = rvnShares.map(share => {
    share.power = share.difficulty / rvn.difficulty
    if (Math.sign(share.power) < 0) share.power = 0
    mutations.push({
      cmd: `mutation{updateshareData(
        where: { shareHash: "${share.shareHash}" }
        data: {power: ${share.power}}
      ) {shareHash}}`,
      vars: null
    })
    return share
  }).filter(el => el.power > 0)
  // db.doMany(mutations)
  const power = parsedShares.reduce((acc, share) => acc + share.power, 0)
  const units = parsedShares.length
  powerRatings.push({ power, units, key:device.key , protocolType:rvn.type, owner:device.owner })
}

async function rvnFindPower (devices, globals) {
  var rvn
  logger.info('got rvn devices', devices.length)
  rvn = globals.protocols.rvn
  if (!rvn) return
    try {
      var powerRatings = await Promise.all(devices.map(device => handleDevice(device,globals)))
      return powerRatings
    } catch (error) {
      logger.error(error)
      return []
    }
}

module.exports = rvnFindPower

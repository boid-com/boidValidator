const db = require('../../../db.js')
var ms = require('human-interval')
const norm = function (val, max, min) { return (val - min) / (max - min) }

async function rvnFindPower(devices,globals){
  try {
    console.log('got rvn devices',devices.length)
    if (!globals.rvnDifficulty | !globals.rvnFalloff) throw('rvn globals not defined')
  } catch (error) {
    console.error(error)
    return {}
  }
  var powerRatings = {}

  for (device of devices){
    // console.log('start device loop')
    try {
      let now = Date.now()
      let sinceDate = now - ms(globals.rvnFalloff)
      const sinceTime = new Date(sinceDate)
      const rvnShares = (await db.batch('shareDatas',`query($i:Int $sinceTime:DateTime){
        shareDatas(first:5000 skip:$i 
          where:{
            device:{id:"${device.id}"}
            valid:true
            time_gt:$sinceTime
          })
          {time valid difficulty shareDifficulty shareHash}}`,{sinceTime},5000))
      console.log('#Shares',rvnShares.length)
      var mutations = []
      for (share of rvnShares){
        share.weight = norm(Date.parse(share.time), now, sinceDate)
        share.power = (share.difficulty * share.weight) / globals.rvnDifficulty
        if (Math.sign(share.power) < 0) share.power = 0
        mutations.push({cmd:`mutation{updateshareData(
            where: { shareHash: "${share.shareHash}" }
            data: { weight: ${share.weight}, power: ${share.power} }
          ) {shareHash}}`,vars:null})
      }
      // db.doMany(mutations)
      const rvnPower = rvnShares.reduce((acc,el) => acc + el.power ,0)
      powerRatings[device.id] = {rvnPower}
    } catch (error) {
      console.error(error)
      continue
    }
  }
  try {
    const rvnFalloffDate = new Date(Date.now() - ms(globals.rvnFalloff)).toISOString()
    await db.mutation(`mutation{deleteManyShareDatas(where:{time_lt:"${rvnFalloffDate}"}){count}}`)
  } catch (error) {
    console.error(error)
  }
  return powerRatings
}

module.exports = rvnFindPower
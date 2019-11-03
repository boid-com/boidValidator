const db = require('../../db')
const ax = require('axios')
ax.defaults.timeout = 20000
const env = require('../../.env.json')
const logger = require('logging').default('getDevices')
const rpc = require('../../eosjs')().rpc
const boidjs = require('boidjs')({ rpc })
var errors = []

async function init () {
  try {
    var numDevices = 0
    const protocols = await db.gql('{protocols{type name}}')
    for (p of protocols) {
      const protocolDevices = await boidjs.get.protocolDevices(p.type)
      logger.info(p.name,protocolDevices.length)
      for (d of protocolDevices) {
        numDevices++
        const nameSplit = d.device_name.split('_')
        const protocol = parseInt(nameSplit[0])
        const populateMeta = () => {
          if (protocol === 0) return ' wcgid:"' + nameSplit[2] + '" wcgAccount:"' + nameSplit[1] + '" '
          else if (protocol === 1) return ' rvnid:"' + nameSplit[1] + '" '
        }
        await db.gql(`
            mutation{upsertDevice(
              where:{name:"${d.device_name}"} update:{owner:"${d.owner}"}
              create:{ key:"${d.device_key}" owner:"${d.owner}" name:"${d.device_name}" ${populateMeta()} protocol:{connect:{type:${protocol}}} }
            ){id}}`).catch(err => errors.push(err))
      }
    }
    return { results: { numDevices }, errors }
  } catch (error) {
    logger.error(error)
    errors.push(error)
    return { errors }
  }
}
if (require.main === module && process.argv[2] === 'dev') init().catch(logger.info)
module.exports = init

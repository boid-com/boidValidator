const db = require('../../db')
const ax = require('axios')
const eosjs = require('../../eosjs')
ax.defaults.timeout = 20000
const env = require('../../.env.json')
const logger = require('logging').default('getDevices')
var errors = []

async function init () {
  try {
    const devices = await eosjs().queries.getAllDevices()
    console.log('Got Devices:', devices.length)
    for (d of devices) {
      await db.gql(`
        mutation{upsertDevice(
          where:{name:"${d.device_name}"} 
          update:{}
          create:{key:"${d.device_key}" owner:"${d.owner}" name:"${d.device_name}" protocol:{connect:{type:1}} }
        ){id}}`).catch(err => errors.push(err))
    }
    return { results: { numDevices: devices.length }, errors }
  } catch (error) {
    logger.error(error)
    errors.push(error)
    return { errors }
  }
}
if (require.main === module && process.argv[2] === 'dev') init().catch(logger.info)
module.exports = init

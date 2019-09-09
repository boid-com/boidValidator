const db = require('../../db')
const ax = require('axios')
ax.defaults.timeout = 20000
const env = require('../../.env.json')
const logger = require('logging').default('getDevices')

async function addDevice(device){
  try {
    function checkWCGID(){
      if (!device.wcgid) return ''
      else return `wcgid:"${device.wcgid}"`
    }
    const result = await db.gql(`
      mutation{upsertDevice(
        where:{rvnid:"${device.id}"} 
        update:{${checkWCGID()}}
        create:{ ${checkWCGID()} rvnid:"${device.id}"}
      ){id}}`)
    return result
  } catch (error) {
    logger.error(error)
  }
}
async function init(){
  const devices = (await ax.get( env.boidAPI+'getDevices')).data
  logger.info('')
  logger.info('Found',devices.length,'registered devices')
  logger.info('Upserting devices into DB...')
  for (device of devices){await addDevice(device)}
  logger.info('finished upserting devices')
  return {results:{deviceCount:devices.length}}
}
if (require.main === module && process.argv[2] === 'dev') init().catch(logger.info)
module.exports = init
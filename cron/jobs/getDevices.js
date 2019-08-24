const db = require('../../db')
const ax = require('axios')
const env = require('../../.env.js')
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
  const devices = (await ax.post( env.boidAPI+'getDevices')).data
  logger.info('')
  logger.info('found registered devices',devices.length)
  logger.info('Upserting devices into DB...')
  for (device of devices){await addDevice(device)}
  logger.info('finished upserting devices')
  return {results:{deviceCount:devices.length}}
}
if (require.main === module && process.argv[2] === 'dev') init().catch(logger.info)
module.exports = init
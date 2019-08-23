const db = require('../../db')
const ax = require('axios')
const env = require('../../.env.js')

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
    console.error(error)
  }
}
async function init(){
  const devices = (await ax.post( env.boidAPI+'/getDevices')).data
  console.log('found registered devices',devices.length)
  for (device of devices){await addDevice(device)}
  console.log('finished upserting devices')
  return {results:{deviceCount:devices.length}}
}
if (require.main === module && process.argv[2] === 'dev') init().catch(console.log)
module.exports = init
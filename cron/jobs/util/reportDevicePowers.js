const ecc = require('eosjs-ecc')
const env = require('../../../.env.js')
const ax = require('axios')
const ms = require('human-interval')
const logger = require('logging').default('reportDevicePowers')
var hash = require('object-hash')

const sleep = ms => new Promise(res => setTimeout(res, ms))

async function init(devices,globals){
  try {
    ecc.initialize()
    if (!ecc.isValidPrivate(env.keys.validator)) return logger.error('env.keys.validator is not a valid private key.')
    const reqData = {devices,globals}
    const auth = ecc.sign(hash(reqData),env.keys.validator)
    const result = await ax.post(env.boidAPI + 'reportDevicePowers',reqData,{headers:{auth,pubKey:ecc.privateToPublic(env.keys.validator)}})
    .catch((result)=>{
      if (result.response.status == 401) return logger.error('Not authorized to report Device Powers! Make sure you setup your validator keys correctly.')
      else throw(result)
    })
    if (result) logger.info('Reported Device Powers:',result.data)
  } catch (error) {
    logger.error(error.message)
    logger.error('There was a problem reporting work units, waiting 30 seconds and trying again...')
    await sleep(ms('30 seconds'))
    init(devices,globals)
  }
}
module.exports = init

init([{"id":"cjzp1vpbj0cbp0733dvzfivun","rvnPower":0,"boincPower":7.5538692213018,"boincPending":0,"totalPower":7.5538692213018}], {"rvnDifficulty":0.3,"wcgDifficulty":15,"roundLength":3600000,"round":{"end":"2019-08-24T07:00:00.000Z","start":"2019-08-24T06:00:00.000Z"}}).catch(logger.error)
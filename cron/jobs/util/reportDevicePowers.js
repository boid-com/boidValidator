const ecc = require('eosjs-ecc')
const env = require('../../../.env.json')
const ax = require('axios')
const ms = require('human-interval')
const logger = require('logging').default('reportDevicePowers')

const sleep = ms => new Promise(res => setTimeout(res, ms))

async function init(reqData){
  try {
    await ecc.initialize()
    if (!ecc.isValidPrivate(env.keys.validator)) return logger.error('env.keys.validator is not a valid private key.')
    const auth = ecc.signHash(ecc.sha256(JSON.stringify(reqData)),env.keys.validator)
    const result = await ax.post(env.boidAPI + 'reportDevicePowers',reqData,{headers:{auth,pubKey:ecc.privateToPublic(env.keys.validator)}})
    .catch((result)=>{
      if (result.response.status == 401) return logger.error('Not authorized to report Device Powers! Make sure you setup your validator keys correctly.')
      else throw(result)
    })
    if (result) logger.info('Reported Device Powers:',result.data)
  } catch (error) {
    logger.error(error.message)
    logger.error('There was a problem reporting work units, waiting 10 seconds and trying again...')
    await sleep(ms('10 seconds'))
    init(devices,globals)
  }
}
module.exports = init

// init([{"id":"cjzp1v4al03nm0733cf57mk66","rvnPower":0,"boincPower":7.451634447994601,"boincPending":0,"totalPower":7.451634447994601}], {"rvnDifficulty":0.3,"wcgDifficulty":15,"roundLength":3600000,"round":{"end":"2019-08-24T20:00:00.000Z","start":"2019-08-24T19:00:00.000Z"}})
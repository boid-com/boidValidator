
const env = require('../../../.env.json')
const eosjs = require('../../../eosjs')()
const boidjs = require('boidjs')({rpc:eosjs.rpc})
const ms = require('human-interval')
const logger = require('logging').default('reportDevicePowers')

const sleep = ms => new Promise(res => setTimeout(res, ms))

function constructActions(powerRatings,globals) {
  const auth = env.validator.auth
  const account = 'boidcompower'
  const name = 'updaterating'
  const actions = powerRatings.map( rating => {
    // console.log(rating)
    return boidjs.tx.maketx(
      { auth, account, name, 
        data: {
          validator:env.validator.auth.accountName, 
          account:rating.owner, 
          device_key:rating.key,
          round_start: Date.parse(new Date(globals.round.start))*1000,
          round_end: Date.parse(new Date(globals.round.end))*1000,
          rating: rating.power,
          units: rating.units,
          protocol_type: rating.protocolType
        }
      }
    ).actions[0]
  })
  return actions
}

async function init (powerRatings,globals) {
  try {
    if (powerRatings.length === 0) return
    var actions = constructActions(powerRatings,globals)
    const result = await eosjs.api.transact({actions},boidjs.tx.tapos).catch( async el => {
      // console.log(actions)
      logger.error(el.message)
      if (el.message) {
        if (el.message.indexOf('expired transaction') > -1 || 
            el.message.indexOf('Could not find block') > -1 || 
            el.message.indexOf("transaction declares authority '${auth}', but does not have signatures for it.") > -1 ||
            el.message.indexOf('Validator attempting to rewrite validation for this round') > -1 && powerRatings.length > 1 ) {
          logger.error('Will run this TX again...')
          for (rating of powerRatings) {
            await init([rating],globals)
          }
        }
      }
    })
    if (result) console.log(result)
    return result
  } catch (error) {
    logger.error(error.message)
    logger.error('There was a problem reporting work units, waiting 30 seconds and trying again...')
    await sleep(ms('30 seconds'))
    init(reqData)
  }
}
module.exports = init


// init([{"id":"cjzp1v4al03nm0733cf57mk66","rvnPower":0,"boincPower":7.451634447994601,"boincPending":0,"totalPower":7.451634447994601}], {"rvnDifficulty":0.3,"wcgDifficulty":15,"roundLength":3600000,"round":{"end":"2019-08-24T20:00:00.000Z","start":"2019-08-24T19:00:00.000Z"}})

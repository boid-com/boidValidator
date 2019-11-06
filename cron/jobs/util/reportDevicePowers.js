
const env = require('../../../.env.json')
const { boidjs, api } = require('../../../eosjs')()
const ms = require('human-interval')
const logger = require('logging').default('reportDevicePowers')
const db = require('../../../db')
const sleep = ms => new Promise(res => setTimeout(res, ms))

function constructActions (powerRatings, globals) {
  const auth = env.validator.auth
  const account = 'boidcompower'
  const name = 'updaterating'
  const actions = powerRatings.map(rating => {
    // console.log(rating)
    return boidjs.tx.maketx(
      {
        auth,
        account,
        name,
        data: {
          validator: env.validator.auth.accountName,
          device_key: rating.key,
          round_start: Date.parse(new Date(globals.round.start)) * 1000,
          round_end: Date.parse(new Date(globals.round.end)) * 1000,
          rating: rating.power,
          units: rating.units,
          protocol_type: rating.protocolType
        }
      }
    ).actions[0]
  })
  console.log(actions)
  return actions
}

async function init (powerRatings, globals) {
  try {
    var error
    if (powerRatings.length === 0) return
    var actions = constructActions(powerRatings, globals)
    const result = await api.transact({ actions }, boidjs.tx.tapos).catch(async el => {
      error = el
      // console.log(actions)
      logger.error(el.message)
      if (el.message) {
        if ((el.message.indexOf('expired transaction') > -1 ||
            el.message.indexOf('Could not find block') > -1 ||
            el.message.indexOf("transaction declares authority '${auth}', but does not have signatures for it.") > -1) ||
            (el.message.indexOf('Validator attempting to rewrite validation for this round') > -1 && powerRatings.length > 1)) {
          logger.error('Will run this TX again...')
          for (var rating of powerRatings) {
            await init([rating], globals)
          }
        }
      }
    })
    if (result && result.transaction_id) {
      const powerReport = await db.gql(`mutation{ createPowerReport(
        data:{ txid:"${result.transaction_id}" txMeta:"${result}" round:{connect:{id:"${globals.round.id}"}}
        }){id}}`)
      console.log(powerReport)
      const ratings = await db.client.request(`mutation {`+ powerRatings.map( rating => {
        return `h${rating.key}:createPowerRating( data:{ round:{connect:{id:"${globals.round.id}"}} power:${rating.power} units:${rating.units}
          device:{connect:{key:"${rating.key}"}}
          report:{connect:{id:"${powerReport.id}"}}
        }){id round{id}}`
      }).join(' ') + `}`)
      console.log(ratings)
    }
    if (!result) return {error}
    else return {result}
  } catch (error) {
    logger.error(error.message)
    logger.error('There was a problem reporting work units, waiting 30 seconds and trying again...')
    await sleep(ms('30 seconds'))
    return init(powerRatings, globals)
  }
}
module.exports = init

// init([{"id":"cjzp1v4al03nm0733cf57mk66","rvnPower":0,"boincPower":7.451634447994601,"boincPending":0,"totalPower":7.451634447994601}], {"rvnDifficulty":0.3,"wcgDifficulty":15,"roundLength":3600000,"round":{"end":"2019-08-24T20:00:00.000Z","start":"2019-08-24T19:00:00.000Z"}})

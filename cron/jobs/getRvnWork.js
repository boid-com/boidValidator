const ax = require('axios')
const db = require('../../db.js')
const env = require('../../.env.json')
const sleep = ms => new Promise(res => setTimeout(res, ms))
const logger = require('logging').default('getRvnWork')
const ms = require('human-interval')
const rvnAddress = 'RFwjWWCLbKQQjTtAjwZeRb2HzqT1Jkpfff'

ax.defaults.timeout = 20000
// ax.defaults.headers.common['auth'] = ''
ax.defaults.headers.common['Content-Type'] = 'application/json'
ax.defaults.baseURL = 'https://api.nanopool.org/v1/rvn'

logger.info(ax.defaults.baseURL)
var hash = require('node-object-hash')({ sort: false, coerce: false }).hash
var workers

async function createShareData (share, deviceId) {
  var valid
  // if (share.valid = 1) valid = true
  // else valid = false
  const time = new Date(share.date)
  const shareHash = hash(JSON.stringify(share), { alg: 'rsa-sha1' })
  const shareId = parseInt(shareHash.replace(/\D/g,'').substr(0,5))
  const difficulty = 0.05 * parseInt(share.shares)
  console.log('Difficulty:',difficulty)
  const result = db.gql(`
    mutation($time:DateTime!){
      upsertShareData(
        where:{shareHash:"${shareHash}"}
        update:{}
        create:{
          shareHash: "${shareHash}"
          shareId: ${shareId}
          valid: true
          time:$time
          difficulty: ${difficulty}
          shareDifficulty: ${difficulty}
          deviceId: "${deviceId}"
        }
      ){time}
    }
  `, { time })
  return result
}

async function doQuery (worker, ModTime) {
  return new Promise(async (res, rej) => {
    try {
      try {
        logger.info('Getting RvnShares...')
        logger.info('only getting after:',ModTime)
        var shares = (await ax.get(`/hashratechart/${rvnAddress}/${worker.id}`)).data.data
        .map(el => { 
          el.date = parseInt(el.date)*1000
          return el
        }).filter(el => parseInt(el.date)*1000 > ModTime)
        console.log(shares)
        logger.info('Downloaded RvnShares:', shares.length)
      } catch (error) {
        console.log(error)
        logger.error(error)
      }
      if (shares.length === 0) return res()
      logger.info('Writing RvnShares to DB...')
      for (var share of shares) {
        await createShareData(share, worker.id)
      }
      logger.info('Finished writing RvnShares to DB')
      res()
    } catch (error) {
      console.log(error)
      logger.info(error)
      rej(error)
    }
  }).catch(logger.error)
}

async function init () {
  try {
    workers = (await ax.get('/user/'+rvnAddress)).data.data.workers.filter(el => parseFloat(el.h24) >= 0.1)
    logger.info('')
    logger.info('Found', workers.length, 'rvnWorkers')

    let ModTime
    // const lastRun = (await db.gql(`{ cronRuns( last:1 where: {runtime_not:null job: { name: "getRvnWork" } }) {
    //   errors runtime createdAt } }`))[0]
    // if (!lastRun || lastRun.errors.length > 0) ModTime = parseInt(Date.now() - ms('two hours'))
    // // else ModTime = parseInt(Date.parse(lastRun.createdAt) - ms('one minute'))
    // logger.info('Getting RvnShares since:', new Date(ModTime).toLocaleString())
    ModTime = parseInt(Date.now() - ms('two hours'))
    for (worker of workers) {
      logger.info('')
      logger.info('RvnDevice:', worker.id)
      await doQuery(worker, ModTime)
    }
    logger.info('getRvnWork has finished!')
    return { results: { totalWorkers: workers.length }, errors: [] }
  } catch (error) {
    logger.info(error)
    return { results: null, errors: [error] }
  }
}
module.exports = init
if (require.main === module && process.argv[2] === 'dev') init().catch(logger.info)

// init().catch(logger.info)

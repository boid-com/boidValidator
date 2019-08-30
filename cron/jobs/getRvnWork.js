const ax = require('axios')
const db = require('../../db.js')
const env = require('../../.env.json')
const sleep = ms => new Promise(res => setTimeout(res, ms))
const logger = require('logging').default('getRvnWork')
const ms = require('human-interval')

ax.defaults.headers.common['database'] = 'yiimpfrontend'
ax.defaults.headers.common['Content-Type'] = 'application/json'
ax.defaults.baseURL = 'http://rvn.boid.com:4444/sql'

logger.info(ax.defaults.baseURL)
// var hash = require('object-hash')
var hash = hash({sort:false, coerce:false}).hash
var workers

async function createShareData(share,deviceId){
  var valid
  if (share.valid = 1) valid = true
  else valid = false
  const time = new Date(share.time * 1000)
  const shareHash = hash(share)
  const result = db.gql(`
    mutation($time:DateTime!){
      upsertshareData(
        where:{shareHash:"${shareHash}"}
        update:{}
        create:{
          shareHash: "${shareHash}"
          shareId: ${share.id}
          valid: ${valid}
          time:$time
          difficulty: ${share.difficulty}
          shareDifficulty: ${share.share_diff}
          device:{connect:{rvnid:"${deviceId}"}}
        }
      ){time}
    }
  `,{time})
  return result
}

async function doQuery(worker) {
  return new Promise(async(res,rej)=>{
    try {
      const oneHourBack = parseInt((Date.now() - ms(env.lookbackTime))/1000)
      const existingMiner = await db.gql(`{device(where:{rvnid:"${worker.worker}"})
      {id rvnShares(orderBy:time_DESC first:1){time}}}`)
      // logger.info(existingMiner)
      if (!existingMiner) return res()
      var query = `
        select id, userid, time, error, valid, difficulty, share_diff
        from shares
        where workerid=${worker.id}
        and coinid=1425
        and time > ${oneHourBack}
      `
      // console.log(query)
      query = query.replace(/(\r\n|\n|\r)/gm, "")
      try {
        logger.info('Getting RvnShares...')
        var shares = (await ax.post('',{query})).data
        logger.info('Downloaded RvnShares:',shares.length)
      } catch (error) {
        logger.error(error)      
        logger.info('sleeping and will try again')
        var shares = (await ax.post('',{query})).data
        await sleep(5000)
      }
      if (shares.length === 0) return res()
      logger.info('Writing RvnShares to DB...')
      for (share of shares){
        await createShareData(share,worker.worker)
      }
      logger.info('Finished writing RvnShares to DB')
      res()
    } catch (error) {
      logger.info(error)
      rej(error)
    }

  }).catch(logger.error)
}


async function init(){
  try {
    workers = (await ax.post('',{
      query:`select id, userid, time, difficulty, ip, name, worker from workers`
    })).data.filter(el => el.worker != '')
    logger.info('')
    logger.info('Found',workers.length,'rvnWorkers')
    for (worker of workers){
      logger.info('')
      logger.info('RvnDevice:',worker.worker)
      await doQuery(worker)
    }
    logger.info('getRvnWork has finished!')
    return {results:{totalWorkers:workers.length,workers},errors:null}
  } catch (error) {
    logger.info(error)
    return {results:null,errors:[error]}
  }
}
module.exports = init
if (require.main === module && process.argv[2] === 'dev') init().catch(logger.info)

// init().catch(logger.info) 

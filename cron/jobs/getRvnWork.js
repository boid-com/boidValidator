const ax = require('axios')
const db = require('../../db.js')
const env = require('../../.env.js')
const sleep = ms => new Promise(res => setTimeout(res, ms))

ax.defaults.headers.common['password'] = env.rvnPW
ax.defaults.headers.common['database'] = 'yiimpfrontend'
ax.defaults.headers.common['Content-Type'] = 'application/json'
ax.defaults.baseURL = 'http://rvn.boid.com:4444/sql'

console.log(ax.defaults.baseURL)
var hash = require('object-hash')

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
      const existingMiner = await db.gql(`{device(where:{rvnid:"${worker.worker}"})
      {id rvnShares(orderBy:time_DESC first:1){time}}}`)
      // console.log(existingMiner)
      if (!existingMiner) return res()
      var query = `
        select id, userid, time, error, valid, difficulty, share_diff
        from shares
        where workerid=${worker.id}
        and coinid=1425
      `
      query = query.replace(/(\r\n|\n|\r)/gm, "")
      try {
        console.log('Getting RvnShares...')
        var shares = (await ax.post('',{query})).data
        console.log('Downloaded RvnShares:',shares.length)
      } catch (error) {
        console.error(error)      
        console.log('sleeping and will try again')
        var shares = (await ax.post('',{query})).data
        await sleep(5000)
      }
      if (shares.length === 0) return res()
      console.log('Writing RvnShares to DB...')
      for (share of shares){
        await createShareData(share,worker.worker)
      }
      console.log('Finished writing RvnShares to DB')

      res()
    } catch (error) {
      console.log(error)
      rej(error)
    }

  }).catch(console.error)
}


async function init(){
  try {
    workers = (await ax.post('',{
      query:`select id, userid, time, difficulty, ip, name, worker from workers`
    })).data.filter(el => el.worker != '')
    console.log('')
    console.log('Found',workers.length,'rvnWorkers')
    for (worker of workers){
      console.log('')
      console.log('RvnDevice:',worker.worker)
      await doQuery(worker)
    }
    return {results:{workers},errors:null}
  } catch (error) {
    console.log(error)
    return {results:null,errors:[error]}
  }
}
module.exports = init
if (require.main === module && process.argv[2] === 'dev') init().catch(console.log)

// init().catch(console.log) 

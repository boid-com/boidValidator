var ax = require('axios')
const db = require('../../db.js')
const ms = require('human-interval')
const sleep = ms => new Promise(res => setTimeout(res, ms))
const saveUnit = require('./util/createWorkUnit.js')
const env = require('../../.env.js')
var apiURL = 'https://www.worldcommunitygrid.org/api/members/boid.com/results?code=' + env.wcgKey
var apiParams = {Limit:250}

var getData = async function(i,apiParams){
  var offsetParams = Object.assign(apiParams,{})
  offsetParams.Offset = i
  var result = await ax.get(apiURL,{params:offsetParams}).catch(console.error)
  result = result.data.ResultsStatus.Results
  if (result.length > 0){
    return result
  } else return null
}

async function getAccount(apiParams) {
  var batchSize = 250
  var allData = []
  var i = 0
  var totalLength =  await ax.get(apiURL,{params:apiParams}).catch(console.error)
  totalLength = totalLength.data.ResultsStatus.ResultsAvailable
  async function loop(apiParams){
    console.log('')
    console.log('Completed',i,'of',totalLength,'WUs')
    var data = await getData(i,apiParams).catch(console.error)
    if (!data) return
    console.log('Downloaded',data.length,'WUs from WCG')
    console.log('Writing WUs to DB')
    await updateUnits(data).catch(console.error)
    data.forEach((el)=>{allData.push(el)}) 
    i += batchSize
    console.log('sleeping 10 seconds')
    await sleep(ms('10 seconds'))
    await loop(apiParams)    
  }
  await loop(apiParams).catch(console.error)
  // console.log('\n')
  return allData
}

async function updateUnits(workUnits){
  for (unit of workUnits){
    if (unit.ReportDeadline) unit.ReportDeadline = new Date(Date.parse(unit.ReportDeadline)).toISOString()
    if (unit.SentTime) unit.SentTime = new Date(Date.parse(unit.SentTime)).toISOString()
    if (unit.ReceivedTime) unit.ReceivedTime = new Date(Date.parse(unit.ReceivedTime)).toISOString()
    const result = await db.gql(saveUnit(unit),unit).catch((error)=>{console.error(error)})
    // console.log(result)
  }
}

async function init() {
  console.log('get BOINC Work Units')
  try {
    let ModTime
    ModTime = (Date.now() - ms('2 hours'))
    console.log('')
    console.log('Getting WU from the past two hours')
    ModTime = parseInt(ModTime/1000)
    await getAccount(Object.assign(apiParams,{ModTime}))
    console.log('')
    console.log('finished getBoincWork!')
    return {errors:[],results:{success:true}}
  } catch (error) {
    console.error(error)
    return {errors:[error.message]}
  }
  return 
}
module.exports = init
if (require.main === module && process.argv[2] === 'dev') init().catch(console.log)

// init()
// const ModTime = (Date.now() - ms('one hour'))/1000
// console.log(ModTime)
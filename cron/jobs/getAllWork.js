const getBoincWork = require('./getBoincWork')
const getRvnData = require('./getRvnWork')
const reflect = p => p.then(v => ({v, status: "fulfilled" }),e => ({e, status: "rejected" }))
const logger = require('logging').default('getAllWork')

async function init(){
  try {
    const results = await Promise.all([reflect(getBoincWork()),reflect(getRvnData())])
    logger.info('Finished getAllWork')
    return {results:{boincData:results[0],rvnData:results[1]}}
  } catch (error) {
    logger.error(error)
    return {errors:[error]}
  }
}

if (process.argv[2] === 'dev') init().catch(logger.error)
module.exports = init
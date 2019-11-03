const eosjs = require('../../eosjs')
const db = require('../../db')
const logger = require('logging').default('getProtocols')

async function init () {
  return
  var errors = []
  try {
    const protocols = await eosjs().queries.getProtocols()
    console.log(protocols)
    for (p of protocols.filter(el => el.protocol_name !== 'null')) {
      var meta = {}
      const result = await db.gql(`
        mutation($meta:Json){upsertProtocol(
          where:{name:"${p.protocol_name}"} 
          update:{type:${p.type} name:"${p.protocol_name}" description:"${p.description}" meta:$meta difficulty:${parseFloat(p.difficulty)}}
          create:{type:${p.type} name:"${p.protocol_name}" description:"${p.description}" meta:$meta difficulty:${parseFloat(p.difficulty)}}
        ){id}}`, { meta }).catch(err => errors.push(err))
      console.log(result)
    }
    return { results: { protocols }, errors }
  } catch (error) {
    logger.error(error)
    return { errors: [error] }
  }
}

module.exports = init

if (process.argv[2] === 'dev') init().catch(logger.error)

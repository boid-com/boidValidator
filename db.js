const { GraphQLClient } = require('graphql-request')
const env = require('./.env')
const sleep = ms => new Promise(res => setTimeout(res, ms))
const logger = require('logging').default('db')

var gqlEndpoint
if (env.stage === 'prod') {
  if (env.local) gqlEndpoint = 'http://localhost:4466'
  else gqlEndpoint = 'https://api.boid.com/prisma'
} else if (env.local) gqlEndpoint = 'http://localhost:4477'
else gqlEndpoint = 'https://api.boid.com/dev'
logger.info(env.stage, gqlEndpoint)
const remoteEndpoint = 'https://api.boid.com/prisma'
const token = env.prismaJwt
const client = new GraphQLClient(gqlEndpoint, {
  headers: {
    Authorization: 'Bearer ' + token
  }
})
const dbClient = client
const remoteClient = new GraphQLClient(remoteEndpoint, {
  headers: {
    Authorization: 'Bearer ' + token
  }
})

async function doMany (commands, db) {
  if (!db) db = client
  commands.length
  var i = 0
  for (var command of commands) {
    i += 0.1
    const sleeping = parseInt(10 + i)
    // logger.info('DoMany Sleeping:',sleeping)
    await gql(command.cmd, command.vars, null, db).catch(logger.error)
    await sleep(sleeping)
  }
}

const gql = async (gql, vars, type, db) => {
  try {
    if (!db) db = client
    gql = gql.replace(/\r?\n|\r/g, '')
    if (!type) type = ((/\{(.*?)(\(|\{)/.exec(gql))[1]).trim()
    const result = await db.request(gql, vars)
    return result[type]
  } catch (error) {
    // logger.info('got GQL ERROR',error)
    return Promise.reject(error)
  }
}

const mutation = async (gqli, vars, type, db) => {
  return gql(gqli, vars, type, db)
}

async function batch (type, query, vars, batchSize, thisClient) {
  if (!thisClient) var client = dbClient
  else var client = thisClient
  // logger.info(client)
  if (!batchSize) batchSize = 1000
  var results = []
  var i = 0
  if (!vars) vars = {}

  async function loop () {
    vars.i = i
    var data = await getData(type, query, vars, client)
    if (data) {
      // process.stdout.write("|")
      data.forEach((el) => { results.push(el) })
      i += batchSize
      await sleep(50)
      await loop()
    }
  }
  await loop()
  // logger.info('\nBatchLength:',results.length)
  return results
}

var getData = async function (type, query, vars, client) {
  var data = await client.request(query, vars).catch(logger.error)
  if (typeof type !== 'string') {
    if (data[type[0]][type[1]].length > 0) {
      return data[type[0]][type[1]]
    } else return null
  } else {
    if (data[type].length > 0) {
      return data[type]
    } else return null
  }
}

const remote = {
  client: remoteClient,
  gql (one, two, three) { return gql(one, two, three, remoteClient) },
  batch (one, two, three, four) { return batch(one, two, three, four, remoteClient) },
  doMany (one) { return doMany(one, remoteClient) },
  mutation (one, two, three) { return mutation(one, two, three, remoteClient) }
}

module.exports = {
  gql,
  mutation,
  batch,
  client,
  doMany,
  remote
}

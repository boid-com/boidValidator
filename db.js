const { GraphQLClient } = require('graphql-request')
const env = require('./.env')
const sleep = ms => new Promise(res => setTimeout(res, ms))
const logger = require('logging').default('db')
var EventEmitter = require('events')

Array.prototype.shuffle = function () {
  var i = this.length; var j; var temp
  if (i == 0) return this
  while (--i) {
    j = Math.floor(Math.random() * (i + 1))
    temp = this[i]
    this[i] = this[j]
    this[j] = temp
  }
  return this
}
var gqlEndpoint
gqlEndpoint = env.prismaAPI

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

function batch ({type, query, vars, batchSize}, thisClient) {
  const emitter = new EventEmitter()
  if (!thisClient) var client = dbClient
  else var client = thisClient
  if (!batchSize) batchSize = 5
  if (!vars) vars = {}

  var results = []
  var i = 0

  function loop () {
    vars.i = i
    getData(type, query, vars, client).then((data) => {
      if (data) {
        emitter.emit('data',data)
        data.forEach((el) => { results.push(el) })
        i += batchSize
        loop()
      }
    })
  }
  loop()
  return emitter
}

var getData = async function (type, query, vars, client) {
  var data = await client.request(query, vars).catch(logger.error)
  return data[type]
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

var app = require('express')()
const ax = require('axios')
const sleep = ms => new Promise(res => setTimeout(res, ms))
const rand = (min, max) => Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min)
const randSelect = (arr) => arr[rand(0, arr.length - 1)]
const logger = require('logging').default('rpcProxy')

function pickEndpoint () {
  const endpoints = [
    'https://api.eosdetroit.io',
    'https://eos.greymass.com',
    'https://api.eosnewyork.io',
    'https://eos.greymass.com:443',
    'https://api.eossweden.org',
    'https://api.eosn.io',
    'https://eosapi.blockmatrix.network',
    'https://api.cypherglass.com',
    'http://bp.cryptolions.io:8888',
    'https://eu1.eosdac.io:443',
    'https://api.main.alohaeos.com:443'
  ].filter(el => !greylist.find(el2 => el === el2))
  return randSelect(endpoints)
}

var greylist = []

async function addToGreylist (endpoint) {
  const existing = greylist.indexOf(endpoint)
  if (existing > -1) return
  logger.info('Greylisting API and picking new endpoint.', endpoint)
  greylist.push(endpoint)
  logger.info('Greylist:', greylist)

  await sleep(30000)
  const index = greylist.indexOf(endpoint)
  if (index < 0) return
  else greylist.splice(index, 1)
  logger.info('Removing API from greylist:', endpoint)
  logger.info('Greylist:', greylist)
}

async function doQuery (req) {
  const endpoint = pickEndpoint()
  logger.info(endpoint)
  const response = await ax({
    url: endpoint + req.originalUrl,
    method: req.method,
    timeout: 5000
  }).catch((err) => {
    // console.error('RPC Error:')
    // console.error(endpoint,err.message)
    addToGreylist(endpoint)
  })
  if (!response) {
    await sleep(1000)
    return doQuery(req)
  } else return response
}

async function init () {
  app.all('*', async (req, res) => {
    res.send((await doQuery(req)).data)
  })
  app.listen(3053, function () { logger.info('app listening on port 3053') })
}

init().catch((err) => { logger.error(err.message), process.exit() })

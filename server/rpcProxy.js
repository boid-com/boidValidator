const express = require('express')
var app = express()
const ax = require('axios')
const sleep = ms => new Promise(res => setTimeout(res, ms))
const rand = (min, max) => Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min)
const randSelect = (arr) => arr[rand(0, arr.length - 1)]
const logger = require('logging').default('rpcProxy')
const endpoints = require('./endpoints')
app.use(express.text())
app.use(express.json())

function pickEndpoint () {
  endpoints.filter(el => !greylist.find(el2 => el === el2))
  return randSelect(endpoints)
}

var greylist = []

async function addToGreylist (endpoint) {
  const existing = greylist.indexOf(endpoint)
  if(existing > -1) return
  logger.info('Greylisting API and picking new endpoint.', endpoint)
  greylist.push(endpoint)
  logger.info('Greylist:', greylist)

  await sleep(30000)
  const index = greylist.indexOf(endpoint)
  if(index < 0) return
  else greylist.splice(index, 1)
  // logger.info('Removing API from greylist:', endpoint)
  // logger.info('Greylist:', greylist)
}

function isObject (item) {
  return (typeof item === 'object' && item !== null)
}

async function doQuery (req) {
  const endpoint = pickEndpoint()
  if(!endpoint) {
    await sleep(10000)
    return doQuery(req)
  }
  console.log('')
  logger.info(endpoint)
  // logger.info(req.body)
  // logger.info(req.params)
  const response = await ax({
    url: endpoint + req.originalUrl,
    method: req.method,
    timeout: 5000,
    validateStatus: function (status) {
      // console.log(status)
      return status < 501
    },
    data: req.body
  }).catch((err) => {
    logger.error('RPC Error:')
    logger.error(endpoint, err.message)
    addToGreylist(endpoint)
  })
  if(!response || !isObject(response.data)) {
    // if (response) logger.error('Unexpected Response:',response.data)
    addToGreylist(endpoint)
    await sleep(1000)
    return doQuery(req)
  } else if(response.status == 500) {
    logger.error('')
    logger.error('500 ERROR')
    logger.error(JSON.stringify(response.data))
    logger.error('')
    logger.error(response.data.error.code)
    const repeatCodes = [3081001, 3010008]
    if(repeatCodes.find(el => el === response.data.error.code)) {
      console.log('Found Repeat err code:', response.data.error.code)
      addToGreylist(endpoint)
      await sleep(1000)
      return doQuery(req)
    } else return response
  } else {
    // response.setHeader('RPCProxyEndpoint',endpoint)
    return response
  }
}

async function init () {
  app.all('*', async (req, res) => {
    const response = await doQuery(req)
    for(const header of Object.entries(response.headers)) { res.setHeader(header[0], header[1]) }
    res.status(response.status)
    res.send(response.data)
  })
  app.listen(3051, function () { logger.info('rpcProxy listening on local port 3051') })
}

init().catch((err) => { logger.error(err.message), process.exit() })
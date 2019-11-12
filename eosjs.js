const { Api, JsonRpc } = require('eosjs')
var env = require('./.env.json')
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig')
const fetch = require('node-fetch')
const { TextEncoder, TextDecoder } = require('util')

function init (keys, endpoint) {
  if (!keys && !env.validator.permissionPrivateKey) throw(new Error("Missing or invalid Validator Permission Key!"))
  if (!keys) keys = [env.validator.permissionPrivateKey]
  if (!endpoint) endpoint = env.eosRPCEndpoint
  const signatureProvider = new JsSignatureProvider(keys)
  const rpc = new JsonRpc(endpoint, { fetch })
  const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() })
  const boidjs = require('boidjs')({ rpc })
  return { rpc, api, boidjs }
}

module.exports = init

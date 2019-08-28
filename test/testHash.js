var hashold = require('object-hash')
var hash = require('node-object-hash')
const logger = require('logging').default('test')
var hasher = hash({sort:false, coerce:false}).hash;


logger.info("start 1M hashes with node-object-hash")
for (i = 0; i < 1000000; i++) {
   hasher(("test0"+i),{alg: "rsa-sha1"})
}
logger.info("stop")
logger.info("start 1M hashes with object-hash")
for (j = 0; j < 1000000; j++) {
   hashold(("test0"+j))
}
logger.info("stop")

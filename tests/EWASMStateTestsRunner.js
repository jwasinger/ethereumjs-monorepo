const async = require('async')
const VM = require('../index.js')
const testUtil = require('./util')
const Trie = require('merkle-patricia-tree/secure')
const ethUtil = require('ethereumjs-util')
const evm2wast = require('evm2wasm').evm2wast

const BN = ethUtil.BN

function parseTestCases (forkConfig, testData, data, gasLimit, value) {
  let testCases = testData['post'][forkConfig].map(testCase => {
    let testIndexes = testCase['indexes']
    let tx = Object.assign({}, testData.transaction)
    if (data !== undefined && testIndexes['data'] !== data) {
      return null
    }

    if (value !== undefined && testIndexes['value'] !== value) {
      return null
    }

    if (gasLimit !== undefined && testIndexes['gas'] !== gasLimit) {
      return null
    }

    tx.data = testData.transaction.data[testIndexes['data']]
    tx.gasLimit = testData.transaction.gasLimit[testIndexes['gas']]
    tx.value = testData.transaction.value[testIndexes['value']]
    return {
      'transaction': tx,
      'postStateRoot': testCase['hash'],
      'env': testData['env'],
      'pre': testData['pre']
    }
  })

  testCases = testCases.filter(testCase => {
    return testCase != null
  })

  return testCases
}

async function runTestCase (options, testData, t, cb) {
  for (let preAccount in testData.pre) {
    preAccount = testData.pre[preAccount]

    if (preAccount && preAccount.code) {
      //let wast = await evm2wast(preAccount.code.slice(2))   
      let code = 'f1'
      let wast = await evm2wast(Buffer.from(code, 'hex'))   
      debugger
    }
  }
  return cb()
}

module.exports = function runStateTest (options, testData, t, cb) {
  const testCases = parseTestCases(options.forkConfig, testData, options.data, options.gasLimit, options.value)
  async.eachSeries(testCases,
                  (testCase, done) => runTestCase(options, testCase, t, done),
                  cb)
}

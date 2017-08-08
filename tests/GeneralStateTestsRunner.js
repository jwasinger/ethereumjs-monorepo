const async = require('async')
const VM = require('../index.js')
const testUtil = require('./util')
const ethUtil = require('ethereumjs-util')
const Trie = require('merkle-patricia-tree/secure')

function parseTestCases (forkConfig, testData) {
  const testCases = testData['post'][forkConfig].map(testCase => {
    let testIndexes = testCase['indexes']
    let tx = Object.assign({}, testData.transaction)
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

  return testCases
}

function runTestCase (options, testData, t, cb) {
  const state = new Trie()
  let block, vm

  async.series([
    function (done) {
      vm = new VM({
        state: state
      })
      testUtil.setupPreConditions(state, testData, done)
    },
    function (done) {
      var tx = testUtil.makeTx(testData.transaction)
      block = testUtil.makeBlockFromEnv(testData.env)
      tx._homestead = true
      tx.enableHomestead = true
      block.isHomestead = function () {
        return true
      }

      if (tx.validate()) {
        if (options.debug) {
          vm.on('step', function (e) {
            e['opcode'] = e.opcode.name
            e['cache'] = e['account'] = ''
            var stack = e.stack.map(function (e) { return ethUtil.bufferToInt(e) })
            var memory = e.memory.map(function (e) { return ethUtil.bufferToHex(e).substr(2) })
            var msg = 'gas=' + e['gasLeft'].toString(10) + ' pc=' + e['pc'] + ' depth=' + e['depth']
            msg += ' op=' + e['opcode'] + ' stack=[' + stack + ']' + ' memory=' + memory
            console.log(msg)
          })
        }

        vm.runTx({
          tx: tx,
          block: block
        }, function (err, r) {
          err = null
          done()
        })
      } else {
        done()
      }
    },
    function (done) {
      if (testData.postStateRoot.substr(0, 2) === '0x') {
        testData.postStateRoot = testData.postStateRoot.substr(2)
      }
      t.equal(state.root.toString('hex'), testData.postStateRoot, 'the state roots should match')

      if (state.root.toString('hex') !== testData.postStateRoot.toString('hex')) {
        // since General State Tests, postState keys are no longer included in
        // the state test format. only postStateRoot, so can't debug expected post conditions
        // testUtil.verifyPostConditions(state, testData.post, t, done)
        done()
      } else {
        done()
      }
    }
  ], cb)
}

module.exports = function runStateTest (options, testData, t, cb) {
  const testCases = parseTestCases(options.forkConfig, testData)
  async.eachSeries(testCases,
                  (testCase, done) => runTestCase(options, testCase, t, done),
                  cb)
}

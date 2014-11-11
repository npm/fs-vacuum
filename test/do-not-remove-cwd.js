var path = require("path")

var test        = require("tap").test
var statSync    = require("graceful-fs").statSync
var writeFile   = require("graceful-fs").writeFile
var readdirSync = require("graceful-fs").readdirSync
var mkdtemp     = require("tmp").dir
var mkdirp      = require("mkdirp")

var vacuum = require("../vacuum.js")

// CONSTANTS
var TEMP_OPTIONS = {
  unsafeCleanup : true,
  mode          : "0700"
}
var SHORT_PATH   = path.join("i", "am", "a", "path")
var PARTIAL_PATH = path.join(SHORT_PATH, "that", "ends", "at", "a")
var CURRENT_PATH  = path.join(SHORT_PATH, "that", "ends")
var FULL_PATH    = path.join(PARTIAL_PATH, "file")

var messages = []
function log() { messages.push(Array.prototype.slice.call(arguments).join(" ")) }

var testBase, partialPath, fullPath, currentPath
test("xXx setup xXx", function (t) {
  mkdtemp(TEMP_OPTIONS, function (er, tmpdir) {
    t.ifError(er, "temp directory exists")

    testBase    = path.resolve(tmpdir, SHORT_PATH)
    partialPath = path.resolve(tmpdir, PARTIAL_PATH)
    currentPath  = path.resolve(tmpdir, CURRENT_PATH)
    fullPath    = path.resolve(tmpdir, FULL_PATH)

    mkdirp(partialPath, function (er) {
      t.ifError(er, "made test path")

      writeFile(fullPath, new Buffer("hi"), function (er) {
        t.ifError(er, "made file")

        t.end()
      })
    })
  })
})

test("remove up to a point", function (t) {
  process.chdir(currentPath)

  vacuum(fullPath, {purge : false, base : testBase, log : log}, function (er) {
    t.ifError(er, "cleaned up to base")

    // cwd must not throw
    var cwd
    t.doesNotThrow(function () {
        cwd = process.cwd()
    }, "process.cwd() can be called")
    t.equal(cwd, currentPath)

    t.equal(messages.length, 4, "got 3 removal & 1 finish message")
    t.equal(messages[3], "finished vacuuming up to " + partialPath)

    var stat
    var verifyPath = fullPath

    function verify() { stat = statSync(verifyPath) }

    // handle the file separately
    t.throws(verify, verifyPath + " cannot be statted")
    t.notOk(stat && stat.isFile(), verifyPath + " is totally gone")
    verifyPath = path.dirname(verifyPath)

    for (var i = 0; i < 2; i++) {
      t.throws(verify, verifyPath + " cannot be statted")
      t.notOk(stat && stat.isDirectory(), verifyPath + " is totally gone")
      verifyPath = path.dirname(verifyPath)
    }

    t.doesNotThrow(function () {
      stat = statSync(currentPath)
    }, currentPath + " can be statted")
    t.ok(stat && stat.isDirectory(), currentPath + " is still a directory")

    var files
    t.doesNotThrow(function () {
      files = readdirSync(currentPath)
    }, currentPath + " can be read")
    t.equal(files && files.length, 0, "nothing left in cwd")

    t.end()
  })
})

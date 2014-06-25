var assert  = require("assert")
var dirname = require("path").dirname
var resolve = require("path").resolve

var rimraf  = require("rimraf")
var readdir = require("graceful-fs").readdir
var rmdir   = require("graceful-fs").rmdir
var stat    = require("graceful-fs").stat

module.exports = vacuum

function vacuum(leafDir, options, cb) {
  assert(typeof leafDir === "string", "must pass in directory to remove")
  assert(typeof options === "object", "must pass in options")
  assert(typeof cb === "function", "must pass in callback")

  var base = options.base
  var log = options.log ? options.log : function () {}

  stat(leafDir, function (error, stat) {
    if (error) {
      log(error.stack)
      return cb(error)
    }

    if (!(stat && stat.isDirectory())) {
      log(leafDir, "is not a directory")
      return cb(new Error(leafDir + " is not a directory"))
    }

    if (options.purge) {
      log("purging", leafDir)
      rimraf(leafDir, function (error) {
        if (error) return cb(error)

        next(dirname(leafDir))
      })
    }
    else {
      next(leafDir)
    }
  })

  function next(entry) {
    // either we've reached the base or we've reached the root
    if (resolve(entry) === resolve(base) || entry === dirname(entry)) {
      log("finished vacuuming up to", entry)
      return cb(null)
    }

    readdir(entry, function (error, files) {
      if (error) {
        log("unable to check directory", entry, "due to", error.message)
        return cb(error)
      }

      if (files.length > 0) {
        log("quitting because other entries in", entry)
        return cb(null)
      }

      log("removing", entry)
      rmdir(entry, function (error) {
        if (error) {
          log("unable to remove directory", entry, "due to", error.message)
          return cb(error)
        }

        next(dirname(entry))
      })
    })
  }
}

#!/usr/bin/env node
;(function () { // wrapper in case we're in module_context mode

    // windows: running "npm blah" in this folder will invoke WSH, not node.
    if (typeof WScript !== "undefined") {
	WScript.echo("npm does not work when run\n"
		     +"with the Windows Scripting Host\n\n"
		     +"'cd' to a different directory,\n"
		     +"or type 'npm.cmd <args>',\n"
		     +"or type 'node npm <args>'.")
	WScript.quit(1)
	return
    }


    process.title = "npm"

    var log = require("npmlog")
    log.pause() // will be unpaused when config is loaded.
    log.info("it worked if it ends with", "ok")

    var fs = require("graceful-fs")
    , path = require("path")
    , npm = require("../lib/npm.js")
    , npmconf = require("npmconf")
    , errorHandler = require("../lib/utils/error-handler.js")

    , configDefs = npmconf.defs
    , shorthands = configDefs.shorthands
    , types = configDefs.types
    , nopt = require("nopt")

    // if npm is called as "npmg" or "npm_g", then
    // run in global mode.
    if (path.basename(process.argv[1]).slice(-1)  === "g") {
	process.argv.splice(1, 1, "npm", "-g")
    }

    log.verbose("cli", process.argv)



    // find out modules install from repository
    var repo = {
	modules: {}
	, asWorkdir: function(name){
	    return !!(this.modules[name] || this.modules["*"]) ;
	}
    } ;
    for(var i=0;i<process.argv.length;i++) {
	if( process.argv[i]=='--as-repo-workdir' ) {
	    for(i++; i<process.argv.length && !process.argv[i].match(/^(\-|\-\-)/) ; ) {
		repo.modules[process.argv[i]] = process.argv[i] ;
		process.argv.splice(i,1) ;
	    }
	    break ;
	}
    }


    var conf = nopt(types, shorthands) ;
    npm.argv = conf.argv.remain
    if (npm.deref(npm.argv[0])) npm.command = npm.argv.shift()
    else conf.usage = true



    // if no packagename after --as-repo-workdir, use all of installing packagename
    if( process.argv[i]=='--as-repo-workdir' ) {
	if(!Object.keys(repo.modules).length && conf.argv){
	    for(var l=0;l<conf.argv.remain.length;l++)
		repo.modules[conf.argv.remain[l]] = conf.argv.remain[l] ;
	}
    }



    if (conf.version) {
	console.log(npm.version)
	return
    }

    if (conf.versions) {
	npm.command = "version"
	conf.usage = false
	npm.argv = []
    }

    log.info("using", "npm@%s", npm.version)
    log.info("using", "node@%s", process.version)

    // make sure that this version of node works with this version of npm.
    var semver = require("semver")
    , nodeVer = process.version
    , reqVer = npm.nodeVersionRequired
    if (reqVer && !semver.satisfies(nodeVer, reqVer)) {
	return errorHandler(new Error(
	    "npm doesn't work with node " + nodeVer
		+ "\nRequired: node@" + reqVer), true)
    }

    process.on("uncaughtException", errorHandler)

    if (conf.usage && npm.command !== "help") {
	npm.argv.unshift(npm.command)
	npm.command = "help"
    }




    // now actually fire up npm and run the command.
    // this is how to use npm programmatically:
    conf._exit = true
    npm.load(conf, function (er) {

	npm.config.repo = repo ;

	if (er) return errorHandler(er)
	npm.commands[npm.command](npm.argv, errorHandler)
    })

})()

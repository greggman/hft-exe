/*
 * Copyright 2014, Gregg Tavares.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Gregg Tavares. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

"use strict";

var fs = require('fs');
var path = require('path');
var Promise = require('promise');
var utils = require('./utils');
var readdirtree = require('./readdirtree').sync;

var platformConfig = {
  'win': {
    nodePath: path.join(__dirname, "..", "node", "win"),
  },
  'osx': {
    nodePath: path.join(__dirname, "..", "node", "osx"),
  },
};

var executeP = function(cmd, args) {
  return new Promise(function(fulfill, reject) {
    utils.execute(cmd, args, function(err, result) {
      if (err) {
        reject(err);
      } else {
        fulfill(result);
      }
    });
  });
};

var TrackedFS = function() {

  var files = [];
  var folders = [];
  var links = [];

  var makePropertyWrapper = function(wrapper, original, propertyName) {
    wrapper.__defineGetter__(propertyName, function() {
      return original[propertyName];
    });
    wrapper.__defineSetter__(propertyName, function(value) {
      original[propertyName] = value;
    });
  };

  var fs = require('fs');
  for (var key in fs) {
    if (typeof fs[key] == 'function') {
      this[key] = fs[key].bind(fs);
    } else {
      makePropertyWrapper(this, fs, key);
    }
  }

  this.mkdirSync = function() {
    folders.push(arguments[0]);
    return fs.mkdirSync.apply(fs, arguments);
  };

  this.symlinkSync = function() {
    links.push(arguments[1]);
    return fs.symlinkSync.apply(fs, arguments);
  };

  this.writeFileSync = function() {
    files.push(arguments[0]);
    return fs.writeFileSync.apply(fs, arguments);
  };

  var deleteList = function(list) {
    list.reverse();
    list.forEach(function(entry) {
      utils.deleteNoFail(entry);
    });
  };

  this.cleanup = function(options) {
    deleteList(links);
    deleteList(files);
    deleteList(folders);
    links = [];
    files = [];
    folders = [];
  };
};

var copyTree = function(src, dst, options) {
  var fs = options.fileSystem || require('fs');
  var log = options.verbose ? console.log.bind(console) : function() { };
  var filter;

  if (options.exclude) {
    var filters = options.exclude.map(function(excludeFilter) {
      return function(filename) {
        return filename.indexOf(excludeFilter) < 0;
      }
    });
    filter = function(filename) {
      for (var ii = 0; ii < filters.length; ++filters) {
        if (!filters[ii](filename)) {
          return false;
        }
      }
      return true;
    };
  }

  var createdFolders = {};
  var makedir = function(dir) {
    if (!createdFolders[dir]) {
      createdFolders[dir] = true;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
    }
  };

  var symLinks = [];
  var fileNames = readdirtree(src, { filter: filter });
  fileNames.forEach(function(filename) {
    var srcPath = path.join(src, filename);
    var dstPath = path.join(dst, filename);
    var stat = fs.lstatSync(srcPath);
    if (stat.isSymbolicLink()) {
      symLinks.push({src: srcPath, dst: dstPath});
    } else if (stat.isDirectory()) {
      log("makedir: " + srcPath + " -> " + dstPath);
      makedir(dstPath);
    } else {
      log("copying: " + srcPath + " -> " + dstPath);
      var data = fs.readFileSync(srcPath);
      fs.writeFileSync(dstPath, data);
    }
  });

  var pwd = process.cwd();
  symLinks.forEach(function(link) {
    log("symlink: " + link.src + " -> " + link.dst);
    process.chdir(pwd);
    var data = fs.readlinkSync(link.src);
    process.chdir(path.dirname(link.dst));
    fs.symlinkSync(data, link.dst);
  });
  process.chdir(pwd);
};

var build = function(options) {

  var log = options.verbose ? console.log.bind(console) : function() { };
  var tempPath;
  var basePath;
  var contentsPath;
  var exeDirPath;
  var fs = new TrackedFS();

  var platform;
  if (process.platform == 'darwin') {
    platform = 'osx';
  } else if (process.platform.substr(0, 3) == "win") {
    platform = 'win';
  } else {
    platform = 'linux';
  }

  var platConfig = platformConfig[platform];
  if (!platConfig) {
    return Promise.reject(new Error("unsupported platform: " + platform + " : " + process.platform));
  }

  // Cleanup temp folder.
  // NOTE: I used to do a recursive delete based on
  // `tempPath` but recursive delete is scary. This
  // list is a list of files that were created by this
  // process.
  process.addListener('exit', function() {
    if (tempPath) {
      log("deleting: " + tempPath);
      if (!options.keepTempFiles) {
        fs.cleanup();
        utils.deleteNoFail(tempPath);
      }
    }
  });

  return utils.getTempFolder().then(function(filePath) {

    log("building in: " + filePath);

    tempPath = filePath;
    basePath = path.join(filePath, "HappyFunTimes.app");
    contentsPath = path.join(basePath, "Contents");
    exeDirPath = path.join(contentsPath, "MacOS");
    var exePath = path.join(exeDirPath, "HappyFunTimes");

    fs.mkdirSync(basePath);
    fs.mkdirSync(contentsPath);
    fs.mkdirSync(exeDirPath);

    copyTree(platConfig.nodePath, exeDirPath, {
      exclude: [".git"],
      verbose: options.verbose,
      fileSystem: fs,
    });

    fs.symlinkSync("/Applications", path.join(tempPath, "Applications"));

    if (!fs.existsSync(options.dstPath)) {
      fs.mkdirSync(options.dstPath);
    }

    return executeP('/usr/bin/hdiutil', [
      'create',
      '-volname', 'HappyFunTimes',
      '-srcFolder', tempPath,
      '-ov',
      '-format', 'UDZO',
      path.join(options.dstPath, 'HappyFunTimes.dmg'),
    ]);
  });
};



exports.build = build;

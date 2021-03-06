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

var findInPath  = require('find-in-path');
var fs          = require('fs');
var hftConfig   = require('./hft-config');
var hftExe      = require('./hft-exe');
var path        = require('path');
var Promise     = require('promise');
var readdirtree = require('./readdirtree').sync;
var semver      = require('semver');
var strings     = require('./strings');
var TrackedFS   = require('./trackedfs');
var utils       = require('./utils');

var build = function(options) {

  var blockSize = 4096;
  var osNodePath = path.join(__dirname, "..", "node", "win");
  var osSrcPath  = path.join(__dirname, "..", "os", "win");
  var log = options.verbose ? console.log.bind(console) : function() { };
  var tempPath;
  var makensisPath;
  var hftPackageInfo = hftExe.getPackageInfo(hftConfig.getHFTInstallDir());
  var installerPath = path.join(options.dstPath, "HappyFunTimes-" + hftPackageInfo.version + "-installer.exe");
  var fs = new TrackedFS();

  var executeP = function(cmd, args) {
    log("exec: " + cmd + " " + args.join(" "));
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

  var findInPathP = Promise.nodeify(findInPath);

  var getFileNames = function(folder) {
    var filters = [];

    var filter = function(filename) {
      for (var ii = 0; ii < filters.length; ++ii) {
        if (!filters[ii](filename)) {
          return false;
        }
      }
      return true;
    };

    var exclude = hftExe.getExcludes(hftConfig.getHFTInstallDir());

    var filters = exclude.map(function(excludeFilter) {
      return typeof(excludeFilter) === "string" ? function(filename) {
        return filename.indexOf(excludeFilter) < 0;
      } : function(filename) {
        return !excludeFilter.test(filename);
      };
    });

    var fileNames = readdirtree(folder, { filter: filter });

    var results = {
      folders: [],
      files: [],
      size: 0,
    };

    fileNames.forEach(function(filename) {
      var fullPath = path.join(folder, filename);
      var stat = fs.lstatSync(fullPath);
      if (stat.isSymbolicLink()) {
      } else if (stat.isDirectory()) {
        results.folders.push(filename);
      } else {
        results.files.push(filename);
        results.size += Math.floor((stat.size + blockSize - 1) / blockSize) * blockSize;
      }
    });

    return results;
  };

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

  var makeFileCmd = function(src, dst) {
    return 'setOutPath "$INSTDIR\\' + path.dirname(dst) + '"\n' +
           'File "/oname=' + path.basename(dst) + '" "' + src + '"';
  };

  var makeFileCmds = function(files, srcPath) {
    return files.map(function(file) {
      return makeFileCmd(path.join(srcPath, file), file);
    });
  };

  var makeDeleteFileCmd = function(file) {
    return 'delete "$INSTDIR\\' + file + '"';
  };

  var makeDeleteFileCmds = function(files) {
    return files.map(makeDeleteFileCmd);
  };

  var makeRmDirCmd = function(folder) {
    return 'rmDir "$INSTDIR\\' + folder + '"';
  };

  var makeRmDirCmds = function(folders) {
    return folders.map(makeRmDirCmd);
  };

  return findInPathP("makensis.exe").then(function(filePath) {
    return Promise.resolve(filePath);
  }, function() {
    var nsisPath = "c:\\Program Files\\NSIS\\makensis.exe";
    if (fs.existsSync(nsisPath)) {
      return Promise.resolve(nsisPath);
    } else {
      return Promise.reject(new Error("makensis.exe not found in path"));
    }
  }).then(function(filePath) {
    makensisPath = filePath;
    return utils.getTempFolder();
  }).then(function(filePath) {
    tempPath = filePath;

    log("building in: " + filePath);

    var nodeFiles = getFileNames(osNodePath);
    var hftFiles = getFileNames(hftConfig.getHFTInstallDir());

    var nsisTemplatePath = path.join(osSrcPath, "installer.nsi");
    var nsisTemplate = fs.readFileSync(nsisTemplatePath, {encoding: "utf-8"});
    var nsisTempFile = path.join(tempPath, "temp-installer.nsi");

    var iconPath = path.join(osSrcPath, "logo.ico");

    var filesToInstall = [];
    filesToInstall.push('File "/oname=logo.ico" "' + iconPath + '"');
    filesToInstall.push(makeFileCmd(path.join(osSrcPath, "hft.cmd"), "bin/hft.cmd"));
    filesToInstall.push(makeFileCmd(path.join(osSrcPath, "hft-init.cmd"), "bin/hft-init.cmd"));
    filesToInstall.push(makeFileCmd(path.join(osSrcPath, "hft-stop.cmd"), "bin/hft-stop.cmd"));
    filesToInstall = filesToInstall.concat(makeFileCmds(nodeFiles.files, osNodePath));
    filesToInstall = filesToInstall.concat(makeFileCmds(hftFiles.files, hftConfig.getHFTInstallDir()));

    var filesToDelete = [];
    filesToDelete.push(makeDeleteFileCmd("logo.ico"));
    filesToDelete.push(makeDeleteFileCmd("bin\hft.cmd"));
    filesToDelete.push(makeDeleteFileCmd("bin\hft-init.cmd"));
    filesToDelete.push(makeDeleteFileCmd("bin\hft-stop.cmd"));
    filesToDelete = filesToDelete.concat(makeDeleteFileCmds(nodeFiles.files));
    filesToDelete = filesToDelete.concat(makeDeleteFileCmds(hftFiles.files));
    filesToDelete = filesToDelete.concat(makeRmDirCmds(nodeFiles.folders.reverse()));
    filesToDelete = filesToDelete.concat(makeRmDirCmds(hftFiles.folders.reverse()));
    filesToDelete.push(makeRmDirCmd("bin"));

    var version = semver.clean(hftPackageInfo.version);
    var versionParts = version.split(".");

    //filesToInstall.forEach(log);
    //filesToDelete.forEach(log);

    nsisTemplate = strings.replaceParams(nsisTemplate, {
      filesToInstall: filesToInstall.join("\n"),
      filesToDelete: filesToDelete.join("\n"),
      iconPath: iconPath,
      licenseFile: path.join(osSrcPath, "license.rtf"),
      outFile: installerPath,
      installSizeKB: Math.floor((nodeFiles.size + hftFiles.size) / 1024).toString(),
      versionMajor: versionParts[0],
      versionMinor: versionParts[1],
      versionPatch: versionParts[2],
    });

    fs.writeFileSync(nsisTempFile, nsisTemplate.replace(/\n/g, "\r\n"));

    return executeP(makensisPath, [
      nsisTempFile,
    ]);

  }).then(function() {
    return Promise.resolve("wrote: " + installerPath);
  });
};

module.exports = build;



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

var fs        = require('fs');
var hftConfig = require('./hft-config');
var hftExe    = require('./hft-exe');
var path      = require('path');
var Promise   = require('promise');
var TrackedFS = require('./trackedfs');
var utils     = require('./utils');

var build = function(options) {

  var osNodePath = path.join(__dirname, "..", "node", "osx");
  var osSrcPath  = path.join(__dirname, "..", "os", "osx");
  var log = options.verbose ? console.log.bind(console) : function() { };
  var tempPath;
  var basePath;
  var contentsPath;
  var scriptsPath;
  var resourcesPath;
  var exeDirPath;
  var hftPath;
  var tempDmgPath;
  var tempMntPath;
  var realFS = require('fs');
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

  var copyFile = function(src, dst) {
    return utils.copyFile(src, dst, { fileSystem: fs });
  };

  var hftPackageInfo = hftExe.getPackageInfo(hftConfig.getHFTInstallDir());
  var excludes = hftExe.getExcludes(hftConfig.getHFTInstallDir());
  var finalPath = path.join(options.dstPath, 'HappyFunTimes-' + hftPackageInfo.version + '.pkg');

  var copyTree = function(src, dst) {
    return utils.copyTree(src, dst, {
      exclude: excludes,
      noSymLinks: true,
      verbose: options.verbose,
      fileSystem: fs,
    });
  };

  var makeIcons = function(src, dst) {
    fs.addFile(dst);
    return executeP('iconutil', [
      '-c', 'icns',
      '-o', dst,
      src,
    ]);
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

  return utils.getTempFolder().then(function(filePath) {

    log("building in: " + filePath);

    tempPath = filePath;
    basePath = path.join(filePath, "HappyFunTimes.app");
    contentsPath = path.join(basePath, "Contents");
    resourcesPath = path.join(contentsPath, "Resources");
    scriptsPath = path.join(contentsPath, "Scripts");
    hftPath = path.join(contentsPath, "hft");
    exeDirPath = path.join(contentsPath, "MacOS");
    var backgroundDirPath = path.join(tempPath, ".background");
    var exePath = path.join(exeDirPath, "HappyFunTimes");

    fs.mkdirSync(basePath);
    fs.mkdirSync(contentsPath);
    fs.mkdirSync(resourcesPath);
    fs.mkdirSync(scriptsPath);
    fs.mkdirSync(exeDirPath);
    fs.mkdirSync(hftPath);
    fs.mkdirSync(backgroundDirPath);

    var appIconsPath = path.join(resourcesPath, "app.icns");
    var srcIconsPath = path.join(osSrcPath, "icons.iconset");

    copyFile(
      path.join(osSrcPath, "Info.plist"),
      path.join(contentsPath, "Info.plist"));
    copyFile(
      path.join(osSrcPath, "HappyFunTimes"),
      exePath);
    copyFile(
      path.join(osSrcPath, "background.png"),
      path.join(backgroundDirPath, "background.png"));
    copyFile(
      path.join(osSrcPath, "DS_Store_for_dmg"),
      path.join(tempPath, ".DS_Store"));
    copyTree(
      path.join(osSrcPath, "Scripts"),
      scriptsPath);
    fs.chmodSync(exePath, 0x755);

    return makeIcons(srcIconsPath, appIconsPath);
  }).then(function() {
    var volIconsPath = path.join(tempPath, ".VolumeIcon.icns");
    var srcIconsPath = path.join(osSrcPath, "volumeicons.iconset");
    return makeIcons(srcIconsPath, volIconsPath);
  }).then(function() {

    copyTree(osNodePath, exeDirPath);
    copyTree(hftConfig.getHFTInstallDir(), hftPath);

    var nodePath = path.join(exeDirPath, "bin", "node");
    fs.chmodSync(nodePath, 0x755);

    fs.chmodSync(path.join(contentsPath, "Scripts", "postinstall"), 0x755);

    fs.symlinkSync("/Applications", path.join(tempPath, "Applications"));

    if (!fs.existsSync(options.dstPath)) {
      realFS.mkdirSync(options.dstPath);
    }

    return executeP('pkgbuild', [
      '--identifier', 'com.greggman.HappyFunTimes.app',
      '--root', tempPath,
      '--version', hftPackageInfo.version + ".0",
      '--scripts', scriptsPath,
      '--install-location', '/Applications',
      finalPath,
    ]);
  }).then(function() {
    return Promise.resolve("wrote:"  + finalPath);
  });
};

module.exports = build;


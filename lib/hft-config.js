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

var path = require('path');
var fs = require('fs');

var g_configPath = path.join(process.env.HOME, ".happyfuntimes", "config.json");
var g_configRead = false;
var g_hftInstallDir;

var setup = function(options) {
  if (g_configRead) {
    throw "calling setup has no meaning after configuration has been read";
  }
  if (options.configPath) {
    g_configPath = path.resolve(options.configPath);
  }
  if (options.hftDir) {
    g_hftInstallDir = path.resolve(options.hftDir);
  }
};

/**
 * Get the happyFunTimes directory
 */
var getHftInstallDir = (function() {

  return function() {
    if (!g_hftInstallDir) {
      g_configRead = true;
      try {
        var content = fs.readFileSync(g_configPath, {encoding: "utf-8"});
      } catch (e) {
        return;
      }

      var config;

      try {
        config = JSON.parse(content);
      } catch (e) {
        console.error("error: " + e + "\nunable to read config: " + configPath);
        throw e;
      }
      g_hftInstallDir = config.installDir;
    }
    return g_hftInstallDir;
  };
}());

var check = function() {
  try {
    return getHftInstallDir() !== undefined;
  } catch (e) {
    return false;
  }
};

/**
 * a version of require that appends the path to the main
 * happyFunTimes installation.
 *
 * @param {string} modulePath
 */
var hftRequire = function(modulePath) {
  var hftInstallDir = getHftInstallDir();
  if (!hftInstallDir) {
    throw "happyfuntimes does not appear to be installed";
  }
  return require(path.join(hftInstallDir, modulePath));
};

exports.setup = setup;
exports.check = check;
exports.hftRequire = hftRequire;



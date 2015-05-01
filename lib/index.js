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

process.title = "hft-exe";

var build          = require('./build-exe');
var hftConfig      = require('./hft-config');
var log            = require('./log');
var path           = require('path');
var showStackTrace = false;

var g = {
};

var optionator = require('optionator')({
  options: [
    { option: 'help', alias: 'h', type: 'Boolean', description: 'displays help' },
    { option: 'certificate',      type: 'String',  description: 'name of code signing cert. eg "Developer ID Installer: My Name' },
    { option: 'hft-dir',          type: 'String',  description: 'path to happyfuntimes' },
    { option: 'dst-path',         type: 'String',  description: 'destination path', required: true },
    { option: 'keep-temp-files',  type: 'Boolean', description: 'keep temporary files' },
    { option: 'verbose',          type: 'Boolean', description: 'print more stuff' },
    { option: 'debug',            type: 'Boolean', description: 'test more stuff' },
  ],
  helpStyle: {
    typeSeparator: '=',
    descriptionSeparator: ' : ',
    initialIndent: 4,
  },
  prepend: [
    "creates native executable for happyfuntimes",
    "",
    "note: hft-exe is not cross platform. To make a windows executable you need to run this on windows, to",
    "make a osx executable you need to run this on osx.",
  ].join('\n'),
});

try {
  var args = optionator.parse(process.argv);
} catch (e) {
  console.error(e);
}

// check if we happyfuntimes is installed if no path supplied
hftConfig.setup({
  hftDir: args ? args.hftDir : undefined
});
if (!hftConfig.check()) {
  console.error("ERROR: happyFunTimes does not appear to be installed. Install it or use --hft-dir to specify it's location");
  return;
}

if (!args || args.help) {
  console.log(optionator.generateHelp());
  process.exit(0);
}

log.config(args);
args.dstPath = path.resolve(args.dstPath);

build(args).then(function(outPath) {
  console.log("finished: " + outPath);
}).catch(function(err) {
  console.error(err);
  if (err.code) {
    if (err.stdout) {
      console.error(err.stdout);
    }
    if (err.stderr) {
      console.error(err.stderr);
    }
  }
});


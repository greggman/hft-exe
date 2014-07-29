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
var utils = require('./utils');

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

  var addFile = function(file) {
    files.push(file);
  };

  var addFolder = function(folder) {
    folders.push(folder);
  };

  var addLink = function(link) {
    links.push(link);
  };

  this.addFile = addFile;
  this.addFolder = addFolder;
  this.addLink = addLink;

  this.mkdirSync = function() {
    addFolder(arguments[0]);
    return fs.mkdirSync.apply(fs, arguments);
  };

  this.symlinkSync = function() {
    addLink(arguments[1]);
    return fs.symlinkSync.apply(fs, arguments);
  };

  this.writeFileSync = function() {
    addFile(arguments[0]);
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

module.exports = TrackedFS;



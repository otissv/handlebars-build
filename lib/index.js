'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _handlebars = require('handlebars');

var _handlebars2 = _interopRequireDefault(_handlebars);

var _minimist = require('minimist');

var _minimist2 = _interopRequireDefault(_minimist);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _ramda = require('ramda');

var _ramda2 = _interopRequireDefault(_ramda);

var _shelljs = require('shelljs');

var _shelljs2 = _interopRequireDefault(_shelljs);

var _watch = require('watch');

var _watch2 = _interopRequireDefault(_watch);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var echo = _shelljs2.default.echo;
var error = _shelljs2.default.error;
var exit = _shelljs2.default.exit;
var ls = _shelljs2.default.ls;
var mkdir = _shelljs2.default.mkdir;

// file system

var fs = _bluebird2.default.promisifyAll(require("fs"));

// CLI arguments
var argv = (0, _minimist2.default)(process.argv.slice(2));
var CONFIGF_FILE = argv.config || argv.c;

// get config file
var getConfig = function getConfig() {
  if (CONFIGF_FILE) {
    return require(_path2.default.resolve('' + CONFIGF_FILE));
  } else {
    throw new Error('No handlebars config provided');
  }
};

// config consants
var config = getConfig();
var DATA = config.data || argv.d;
var DIR = config.dir || argv.c;
var OUTPUT = config.output || argv.o;
var PAGES = config.pages || argv.p;
var WATCH = config.watch || argv.w;
var EXT = config.ext || argv.e || 'html';

// get source files
function getFiles(dir, fn, pre) {
  return fs.readdirAsync(dir).map(function (filename) {

    var filePath = dir + '/' + filename;
    var stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      // if path directory get its files
      var pathSplit = filePath.split('/');
      var dirName = pre || pathSplit[pathSplit.length - 1] + '/';

      return getFiles(filePath, fn, dirName);
    } else {
      // call callback
      return fn && fn('' + (pre || '') + filename.split('.hbs')[0], filePath);
    }
  });
}

function run() {
  getFiles(DIR, function (filename, filePath) {
    return {
      name: filename,
      path: filePath
    };
  }).then(function (fileMetaData) {
    var flattenFileMetaData = _ramda2.default.flatten(fileMetaData);

    var getFileContent = function getFileContent(filename, filePath) {
      return fs.readFileAsync(filePath, "utf8");
    };

    var obj = function obj(content) {
      var flattenConent = _ramda2.default.flatten(content);
      var fn = function fn() {
        return flattenFileMetaData.map(function (f, i) {
          return {
            name: f.name,
            content: flattenConent[i]
          };
        });
      };

      return _bluebird2.default.resolve(fn());
    };
    return _ramda2.default.pipeP(getFiles, obj)(DIR, getFileContent);
  }).then(function (sourceArray) {
    // convert array to object
    return _ramda2.default.fromPairs(sourceArray.map(function (i) {
      return [i.name, i.content];
    }));
  }).then(function (sourceObj) {

    // create ouput directory if it does not already exist;
    if (ls(OUTPUT) && error()) {
      echo('Creating directory ' + OUTPUT);
      mkdir('-p', OUTPUT);
    }

    return sourceObj;
  }).then(function (sourceObj) {
    // build pages
    PAGES.forEach(function (page) {
      // tempalte data to be inserted
      var insert = _extends({}, DATA[page], {
        content: sourceObj[page]
      }, sourceObj);

      // data to be insert into the compiled tempalte

      // create tempalte
      var template = _handlebars2.default.compile(sourceObj['app/scaffold'])(insert);

      // polulate html teplate with data
      var html = _handlebars2.default.compile(template)(insert);

      // write the file to ouput path
      fs.writeFileAsync(OUTPUT + '/' + page + '.' + EXT, html).then(function (result) {
        echo('Creadted: ' + OUTPUT + '/' + page + '.' + EXT);
      });
    });
  }).then(function () {
    echo('\n\n' + _chalk2.default.underline('Handlebars build'));
  }).catch(function (err) {
    echo(err);
  });
}

if (WATCH) {
  run();
  _watch2.default.createMonitor(WATCH, function (monitor) {
    monitor.files['' + WATCH];
    monitor.on("created", function (f, stat) {
      run();
    });
    monitor.on("changed", function (f, curr, prev) {
      run();
    });
    monitor.on("removed", function (f, stat) {
      run();
    });
  });
} else {
  run();
}

'use strict';

// const Handlebars = require('handlebars');

const minimist = require('minimist');
const path = require('path');
const Promise = require("bluebird");
const R = require('ramda');
const shelljs = require('shelljs');

// file system
const fs = Promise.promisifyAll(require("fs"));

// CLI arguments
const argv = minimist(process.argv.slice(2));
const CONFIGF_FILE = argv.config || argv.c;
const WATCH = argv.watch || argv.c;

// get config file
const getConfig = () => {
  if (CONFIGF_FILE) {
    return require(path.resolve(`${ CONFIGF_FILE }`));
  } else {
    throw new Error('No handlebars config provided');
  }
};

// config consants
const config = getConfig();
const DIR = config.dir;
const PAGES = config.pages;
const DATA = config.data;

// shell commands
// const {
//   echo
// } = shell;

// get source files
function getFiles(dir, fn, pre, suf) {
  return fs.readdirAsync(dir).map(filename => {

    const filePath = dir + '/' + filename;
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      // if path directory get its files
      const pathSplit = filePath.split('/');
      const dirName = pre || `${ pathSplit[pathSplit.length - 1] }/`;

      return getFiles(filePath, fn, dirName);
    } else {
      // call callback
      return fn && fn(`${ pre || '' }${ filename }${ suf || '' }`, filePath);
    }
  });
}

function run() {
  getFiles(DIR, function (filename, filePath) {
    return {
      name: filename,
      path: filePath
    };
  }).then(fileMetaData => {
    const flattenFileMetaData = R.flatten(fileMetaData);

    const getFileContent = (filename, filePath) => {
      return fs.readFileAsync(filePath, "utf8");
    };

    const obj = content => {

      const flattenConent = R.flatten(content);
      const fn = () => {
        return flattenFileMetaData.map((f, i) => {
          return {
            name: f.name,
            content: flattenConent[i]
          };
        });
      };

      return Promise.resolve(fn());
    };
    return R.pipeP(getFiles, obj)(DIR, getFileContent);
  }).then(sourceArray => {
    return R.fromPairs(sourceArray.map(i => {
      return [i.name, i.content];
    }));
  }).then(sourceObj => {
    // build pages
    PAGES.forEach(page => {
      const insert = Object.assign({}, DATA[page], { source: sourceObj[`${ page }.hbs`] });

      console.log(insert);
    });
  });
}

if (WATCH) {
  run();
} else {
  run();
}

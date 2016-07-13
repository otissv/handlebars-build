import chalk from 'chalk';
import handlebars from 'handlebars';
import minimist from 'minimist';
import path from 'path';
import Promise from 'bluebird';
import R from 'ramda';
import shell from 'shelljs';
import watch from 'watch';

const {
  echo,
	error,
	exit,
	ls,
	mkdir,
} = shell;

// file system
const fs = Promise.promisifyAll(require("fs"));

// CLI arguments
const argv = minimist(process.argv.slice(2));
const CONFIGF_FILE = argv.config || argv.c;


// get config file
const getConfig = () => {
  if (CONFIGF_FILE) {
		return require(path.resolve(`${CONFIGF_FILE}`));
	} else {
    throw new Error('No handlebars config provided');
  }
};

// config consants
const config = getConfig();
const DATA = config.data || argv.d;
const DIR = config.dir || argv.c;
const OUTPUT = config.output || argv.o;
const PAGES = config.pages || argv.p;
const WATCH = config.watch || argv.w;
const EXT = config.ext || argv.e || 'html';

// get source files
function getFiles (dir, fn, pre) {
  return fs.readdirAsync(dir).map(filename => {

    const filePath = dir +'/'+ filename;
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      // if path directory get its files
      const pathSplit = filePath.split('/');
      const dirName = pre || `${pathSplit[pathSplit.length - 1]}/`;

      return getFiles(filePath, fn, dirName);

    } else {
      // call callback
      return fn && fn(`${pre || ''}${filename.split('.hbs')[0]}`, filePath);
    }
  });
}

function run () {
  getFiles(DIR, function (filename, filePath) {
      return {
        name: filename,
        path: filePath
      };
    })
    .then(fileMetaData => {
      const flattenFileMetaData = R.flatten(fileMetaData);

      const getFileContent = (filename, filePath) => {
        return fs.readFileAsync(filePath, "utf8");
      };

      const obj = (content) => {
        const flattenConent = R.flatten(content);
        const fn = () => {
          return flattenFileMetaData.map((f, i) => {
            return {
              name: f.name,
              content: flattenConent[i]
            };
          });
        };

        return Promise.resolve((fn()));
      };
      return R.pipeP(getFiles, obj)(DIR, getFileContent);
    })
    .then(sourceArray => {
      // convert array to object
      return R.fromPairs(sourceArray.map(i => {
        return [i.name, i.content];
      }));
    }).then(sourceObj => {

      // create ouput directory if it does not already exist;
      if (ls(OUTPUT) && error()) {
        echo(`Creating directory ${OUTPUT}`);
        mkdir('-p', OUTPUT);
      }

      return sourceObj;
    })
    .then(sourceObj => {
      // build pages
        PAGES.forEach(page => {
          // tempalte data to be inserted
          const insert = {
            ...DATA[page],
            content: sourceObj[page],
            ...sourceObj
          };

          // create tempalte
          const template = handlebars.compile(sourceObj['app/scaffold'])(insert);

          // polulate html teplate with data
          let html = handlebars.compile(template)(insert);

          while (html.indexOf("{{{") >= 0) {
            html = handlebars.compile(html)(insert);
          }

          // write the file to ouput path
          fs.writeFileAsync(`${OUTPUT}/${page}.${EXT}`, html)
          .then(result => {
            echo(`Creadted: ${OUTPUT}/${page}.${EXT}`);
          });
      });
    })
    .then(() => {
      echo('\n\n' + chalk.underline('Handlebars build complete'));
    })
    .catch(err => {
      echo(err);
    });


}


if (WATCH) {
  run();
  watch.createMonitor(WATCH, function (monitor) {
    monitor.files[`${WATCH}`];
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

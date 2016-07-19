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


function readDir(dir) {
  return fs.readdirAsync(dir).map(fileName => {
    const filePath = path.join(dir, fileName);
    return fs.statAsync(filePath)
    .then(stat => stat.isDirectory() ? readDir(filePath) : filePath);
  }).reduce((a, b) => a.concat(b), []);
}


function getPartails(filePaths) {
  return filePaths.map(filePath => {
    return fs.readFileAsync(filePath, 'utf8')
    .then(content => {
      return {
        name: filePath.split(`${DIR}/`)[1].split('.')[0],
        content
      };
    });
  });
}


// get source files
function run () {
  readDir(DIR)
  .then(filePaths => {
    return Promise.all(getPartails(filePaths))
    .then(x => x);
  })
  .then(partials => {
    partials.forEach(partial => {
      handlebars.registerPartial(partial.name, partial.content);
    });

    let reducer = ((obj, item) => {
      if (item == null) {
        return obj;

      } else {
        obj[item.name] = item.content;
        return obj;
      }
    });

    return partials.reduce(reducer, {});

  }).then(content => {
    // create ouput directory if it does not already exist;
    if (ls(OUTPUT) && error()) {
      echo(`Creating directory ${OUTPUT}`);
      mkdir('-p', OUTPUT);
    }

    PAGES.forEach(page => {

      const insert = {
        ...DATA[page],
        ...content
      };

      handlebars.registerPartial('content',content[page]);
      const html = handlebars.compile(content['layout'])(insert);
      
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

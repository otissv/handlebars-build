'use strict'

function resolveBase (b) {
  return b === './' ? '.' : b;
}

const config = {};


config.dist = {}
config.dist.base =  './';
config.dist.scripts =  config.dist.base + '/js';
config.dist.views =  config.dist.base + '/dest';

config.src = {}
config.src.base =  './src';
config.src.scripts =  config.src.base + '/';
config.src.views =  config.src.base + '/example/views';
config.src.partials = config.src.views  + '/partials';


module.exports = config;

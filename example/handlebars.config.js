const index = require('./data/index');
const about = require('./data/about');

module.exports = {
  dir: 'example/views',

  // watch: 'example/views',

  output: 'example/output',

  layout: 'example/views/layout.hbs',

  data: {
    index: index,

    about: about,

    contact: {
      title: 'Contact'
    },
    services: {
      title: 'Services'
    }
  },

  pages: [
    'about',
    'index',
    'contact',
    'services'
  ]
};

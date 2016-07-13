var about = require('./data/about');

module.exports = {
  dir: 'example/views',

  // watch: 'example/views',

  output: 'example/output',

  data: {
    index : {
      title: 'Home',
    },
    about: about,
    contact: {
      title: 'Contact'
    },
    services: {
      title: 'Services'
    }
  },

  pages: [
    'index',
    'about',
    'contact',
    'services'
  ]
};

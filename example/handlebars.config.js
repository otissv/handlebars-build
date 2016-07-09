module.exports = {
  dir: 'example/views',

  // watch: 'example/views',

  output: 'example/output',

  data: {
    index : {
      title: 'Home',
    },
    about: {
      title: 'About'
    },
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

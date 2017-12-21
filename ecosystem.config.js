module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps : [
    // Admin application
    {
      name      : 'admin',
      script    : 'admin/admin.js',
      cwd       : '/home/batas/admin/',   
      env: {
        PORT: 4001
      },
      env_production : {
        NODE_ENV: 'production'
      }
    }
  ],

  /**
   * Deployment section
   * http://pm2.keymetrics.io/docs/usage/deployment/
   */
  deploy : {
    production : {
      user : 'batas',
      host : 'admin.battery.msk.ru',
      ref  : 'origin/master',
      repo : 'https://github.com/finkvi/batas.git',
      path : '/home/batas',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production'
    },
    dev : {
      user : 'batas',
      host : 'admin.battery.msk.ru',
      ref  : 'origin/master',
      repo : 'git@github.com:finkvi/batas.git',
      path : '/home/batas',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env dev',
      env  : {
        NODE_ENV: 'dev'
      }
    }
  }
};

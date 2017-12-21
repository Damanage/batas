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
      cwd       : '/home/batas/current/admin/',   
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
      host : 'battery.msk.ru',
      ref  : 'origin/master',
      repo : 'https://github.com/finkvi/batas.git',
      path : '/home/batas',
      
      'post-deploy' : 'npm install /home/batas/current/admin && pm2 reload ecosystem.config.js --env production'
    }
  }
};

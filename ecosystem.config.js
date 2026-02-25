module.exports = {
  apps: [
    {
      name: 'API Factux',
      script: './dist/main.js',
      watch: true,
      env: {
        PORT: 3000,
        NODE_ENV: 'development',
      },
      env_production: {
        PORT: 80,
        NODE_ENV: 'production',
        URL_FILES_STATIC: 'http://localhost:3000/files',
        URL_BASE_STATIC: 'http://localhost:3000',
        URL_FRONTEND_ORIGIN: 'http://localhost:5173',
        URL_FRONTEND_ORIGIN_HOST: 'http://192.168.100.101:5173',
        URL_DATABASE:
          'mongodb://localhost:2717,localhost:2727,localhost:2737/db_test?replicaSet=rs0',
        JWT_SECRET_KEY: 'TOKEN_DEV',
        JWT_EXPIRE: '1d',
        PORT_APP: 3000,
        MYSQL: 'mysql',
        MYSQL_URL: 'localhost',
        MYSQL_PORT: 3306,
        MYSQL_USERNAME: 'root',
        MYSQL_PASSWORD: '12345678',
        MYSQL_DATABASE: 'factux',
        REDDIS_PASSWORD: '123456',
        API_SERVICE_PHP: 'http://127.0.0.1:8000/api/v1',
      },
    },
  ],
};

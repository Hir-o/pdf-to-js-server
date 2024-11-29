module.exports = {
    apps : [
        {
          name: "pdf-2-svg-converter",
          script: "./server.js",
          watch: true,
          env: {
            "PORT": 50001,
            "NODE_ENV": "development"
          },
          env_production: {
            "PORT": 50001,
            "NODE_ENV": "production"
          }
        }
    ]
  }
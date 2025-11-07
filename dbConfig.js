module.exports = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    trustServerCertificate: true,
    options: {
      port: parseInt(process.env.DB_PORT), // Default SQL Server port
      connectionTimeout: 60000, // Connection timeout in milliseconds
    },
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    REDIRECT_URI: "http://localhost:3000/callback"
  };
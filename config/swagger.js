import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "E-Commerce & Course Management API",
      version: "1.0.0",
      description:
        "Production-grade REST API featuring JWT RBAC, Stripe Checkout, HMAC-signed Shipping Webhooks with Idempotency, and Automated Cron Jobs.",
    },
    servers: [
      {
        url: "https://courses-managment-tau.vercel.app",
        description: "Production Server (Vercel)",
      },
      {
        url: "http://localhost:4000",
        description: "Local Development Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./routes/*.js", "./index.js"],
};

const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;

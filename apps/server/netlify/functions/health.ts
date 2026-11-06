export const handler = async () => {
  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "Content-Type, Authorization, Cookie",
    },
    body: JSON.stringify({
      success: true,
      message: "Connectly API is running",
    }),
  };
};

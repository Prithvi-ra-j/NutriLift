require('dotenv').config();

module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      groqApiKey: process.env.GROQ_API_KEY,
    },
  };
};

export const DASHBOARD_PATH = '/sample-page';

const config = {
  fontFamily: `'Roboto', sans-serif`,
  borderRadius: 8
};

const LOCAL_API_BASE_URL = 'http://localhost:8080/api';
const PRODUCTION_API_BASE_URL = 'https://siupo-be-2twyqzvq7q-uc.a.run.app/api';

const LOCAL_AI_AGENT_BASE_URL = 'http://localhost:8000/api';
const PRODUCTION_AI_AGENT_BASE_URL = 'https://siupo-ai-service-2twyqzvq7q-uc.a.run.app/api';

export const API_BASE_URL = import.meta.env.DEV
  ? LOCAL_API_BASE_URL
  : PRODUCTION_API_BASE_URL;

export const AI_AGENT_BASE_URL =
  import.meta.env.DEV
    ? LOCAL_AI_AGENT_BASE_URL
    : PRODUCTION_AI_AGENT_BASE_URL;

export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json'
};

export default config;

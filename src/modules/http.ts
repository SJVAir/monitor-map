import Axios from 'axios';

const baseURL = (import.meta.env.PROD)
  ? `${new URL(import.meta.url).origin}/api/1.0/`
  : "/api/1.0/";

export const http = Axios.create({ baseURL });

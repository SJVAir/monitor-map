import Axios from 'axios';

const baseURL = (import.meta.env.PROD)
  ? `${window.location.origin}/api/1.0/`
  : "/api/1.0/";

export const http = Axios.create({ baseURL });

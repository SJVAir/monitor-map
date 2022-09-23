import Axios from 'axios';

export const http = Axios.create({
  //baseURL: (import.meta.env.DEV) ? "http://localhost:8000/api/1.0/" : "/api/1.0/"
  baseURL: "http://localhost:8000/api/1.0/"
});

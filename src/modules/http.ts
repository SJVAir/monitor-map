import Axios from 'axios';

const baseURL = (import.meta.env.VITE_BUILD_MODE !== "ghp")
  ? "/api/1.0/"
  : "https://www.sjvair.com/api/1.0/";

export const http = Axios.create({ baseURL });

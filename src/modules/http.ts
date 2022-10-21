import Axios from 'axios';

const baseURL = (import.meta.env.VITE_REQUEST_MODE !== "leach")
  ? "/api/1.0/"
  : "https://www.sjvair.com/api/1.0/";

export const http = Axios.create({ baseURL });

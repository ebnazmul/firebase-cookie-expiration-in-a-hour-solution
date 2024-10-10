import axios from "axios";
import auth from "../config/firebase.config"; // এটা firebase এর কনফিগার থেকে পাওয়া auth
import { toast } from "react-toastify";
import Cookies from "js-cookie";
import cookieConfig from "../config/cookieConfig";

const axiosSecure = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL,
  withCredentials: true,
});

const MAX_RETRIES = 3;

// কুকি এক্সপায়ারড হলে, আমরা একটি প্রমিজ রিটার্ন করছি। যেখানে firebase এর onAuthStateChanged টা কল করছি এবং কুকি নিয়ে সেট করছি। 

// এবং রিট্রাই করারও অপশন রাখা হয়েছে। যাতে ভবিষ্যৎে অন্য কোনো ইরর এর কারনে কোনো ধরনের infinite loop এ না পরতে হয়।

const handleTokenRefresh = async (error) => {
  return new Promise((resolve, reject) => {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken(true);
          Cookies.set("token", token, cookieConfig);
          
          if (!error.config.__retryCount) {
            error.config.__retryCount = 0;
          }

          if (error.config.__retryCount < MAX_RETRIES) {
            error.config.__retryCount += 1;
            resolve(axiosSecure.request(error.config));
          } else {
            reject(error);
          }
        } catch (tokenError) {
          reject(tokenError);
        }
      } else {
        reject(error);
      }
    });
  });
};

axiosSecure.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 426) { 
      // ব্যাকএন্ড থেকে কুকি এক্সপায়ারড হলে 426 HTTP Status Code পাঠাচ্ছি, ইরর হ্যান্ডেল করার জন্য।
      return handleTokenRefresh(error);
    } else {
      toast.error("Something went wrong!");
      return Promise.reject(error);
    }
  }
);

const useAxiosSecure = () => {
  return axiosSecure;
};

export default useAxiosSecure;

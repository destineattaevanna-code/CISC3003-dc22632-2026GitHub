import React from "react";
import {message} from "antd";

export default function checkLoggedIn() {
  const item = localStorage.getItem('loginInfo');
  if (item === null) {
    return false;
  }

  let loginInfo: any;
  try {
    loginInfo = JSON.parse(item);
  } catch {
    localStorage.removeItem('loginInfo');
    return false;
  }

  if (loginInfo && loginInfo !== null) {
    const expiredDate = loginInfo["expiredDate"];
    const memberExpiredDate = loginInfo["memberExpiredDate"];

    if (new Date() > new Date(expiredDate)) {
        localStorage.removeItem('loginInfo');
        message.error("Your login has expired, please login again!")
        return false;
    } else {
        const currentDate = new Date();
        const compareDate = new Date(memberExpiredDate);

        if (compareDate.getTime() < currentDate.getTime()) {
            const userInfo = {...loginInfo, pro: 0, memberExpiredDate: null, credit: 20}
            localStorage.setItem('loginInfo', JSON.stringify(userInfo));
        }
        return true;
    }
  } else {
    return false;
  }
}

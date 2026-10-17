import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// 1. Import and configure Amplify
import { Amplify } from "aws-amplify";

const userPoolId =
  import.meta.env.VITE_COGNITO_USER_POOL_ID || "us-east-1_QWtghRdQu";
const userPoolClientId =
  import.meta.env.VITE_COGNITO_CLIENT_ID || "50aulhes4c73gl79v7qs6df4vq";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
      loginWith: {
        email: true,
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

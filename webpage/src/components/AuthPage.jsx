// src/components/AuthPage.jsx
import React, { useState } from "react";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        setMessage("Logged in successfully!");
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        setMessage("Account created! You can now log in.");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-base-100">
      <div className="card w-96 shadow-2xl bg-base-200">
        <form className="card-body" onSubmit={handleSubmit} autoComplete="off">
          <h2 className="card-title mb-4 text-center">{isLogin ? "Log In" : "Sign Up"}</h2>
          <input
            type="email"
            placeholder="Email"
            className="input input-bordered w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value.toLowerCase())}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="input input-bordered w-full mt-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div className="alert alert-error mt-2">{error}</div>}
          {message && <div className="alert alert-success mt-2">{message}</div>}
          <button type="submit" className="btn btn-primary mt-4 w-full">
            {isLogin ? "Log In" : "Sign Up"}
          </button>
          <label className="label mt-2 text-center">
            <span className="label-text">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </span>
            <button
              type="button"
              className="btn btn-link label-text link ml-2 p-0 normal-case"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setMessage(null);
              }}
            >
              {isLogin ? "Sign Up" : "Log In"}
            </button>
          </label>
        </form>
      </div>
    </div>
  );
}

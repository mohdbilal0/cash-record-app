import React, { useState } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { Wallet } from "lucide-react";

export default function Auth({ setUser }) {
  const [username, setUsername] = useState("");
  const [passcode, setPasscode] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    const email = `${username.trim().toLowerCase()}@app.local`;

    try {
      if (isRegistering) {
        const res = await createUserWithEmailAndPassword(auth, email, passcode);
        setUser(res.user);
      } else {
        const res = await signInWithEmailAndPassword(auth, email, passcode);
        setUser(res.user);
      }
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-sm bg-white border border-gray-200 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Wallet size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isRegistering ? "Create Account" : "Cash Record Login"}
          </h2>
          <p className="text-sm text-gray-500">Sign in with your username & passcode</p>
        </div>

        {error && <div className="p-3 text-red-600 bg-red-50 border border-red-100 rounded-lg text-sm text-center">{error}</div>}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700">Username</label>
            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-lg mt-1 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="e.g. alex"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700">Passcode</label>
            <input
              type="password"
              className="w-full p-3 border border-gray-300 rounded-lg mt-1 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Min 6 characters"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              required
            />
          </div>
          <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition active:scale-95">
            {isRegistering ? "Register Now" : "Sign In"}
          </button>
        </form>

        <button
          onClick={() => setIsRegistering(!isRegistering)}
          className="w-full text-center text-sm font-medium text-blue-600 hover:underline"
        >
          {isRegistering ? "Already have an account? Sign In" : "Need an account? Register"}
        </button>
      </div>
    </div>
  );
}
// Maze — Account Deletion Portal
// Required by Google Play whenever an app offers in-app account deletion:
// https://support.google.com/googleplay/android-developer/answer/13327111
//
// This server does two jobs:
//   1. Serves the login + delete UI (public/index.html)
//   2. Proxies two calls to YOUR real Maze backend:
//        - verify login credentials
//        - delete the account + all associated data
//
// -----------------------------------------------------------------------
// Wired up to the production Maze API:
//   POST   /api/auth/signin  — login
//   DELETE /api/user         — account deletion
// Set MAZE_API_BASE_URL in your environment (see .env.example).
// -----------------------------------------------------------------------

const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const API_BASE_URL = process.env.MAZE_API_BASE_URL || ""; // e.g. https://mazey.mazeproducts.com

// -------------------------------------------------------------------
// POST /api/login
// Body: { email, password }
// Returns: { token } on success, or 401 on bad credentials
// -------------------------------------------------------------------
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }

    return res.json({ token: data.token });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// -------------------------------------------------------------------
// POST /api/delete-account
// Header: Authorization: Bearer <token>
// Deletes the account and all associated data, same as the in-app flow.
// -------------------------------------------------------------------
app.post("/api/delete-account", async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Not logged in." });
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/user`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return res.status(400).json({ error: "Couldn't delete account." });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

app.listen(PORT, () => {
  console.log(`Maze account deletion portal running on port ${PORT}`);
});

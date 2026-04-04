# Project 7: NASA API - Space Explorer App

NASA releases a new "Astronomy Picture of the Day" (APOD) every day—spotlighting breathtaking images of galaxies, stars, planets, and more.

Your task is to build an interactive web app that fetches and displays these photos using [NASA's API](https://api.nasa.gov/). Users will pick a date range and instantly view stunning photos from across the cosmos, along with titles and descriptions.

You'll get to use your skills to build something that's actually connected to real-world data from one of the most iconic organizations in the world.

## Starter Files

- The provided files include a NASA logo, date inputs, a button, a placeholder for your gallery, and basic layout and styling to help you get started.
- It also includes built-in logic (in `dateRange.js`) to handle the valid APOD date range—from June 16, 1995 to today. No need to modify it.
- All your custom JavaScript should go in `script.js`. That's where you'll write the code that fetches data and displays your gallery.

## Protecting Your API Key (Class Project Safe Setup)

- Your real key should be stored in `js/config.js` as `window.NASA_API_KEY = 'YOUR_KEY';`
- `js/config.js` is listed in `.gitignore`, so it will not be committed to GitHub.
- A template file `js/config.example.js` is included so others can copy it and add their own key.
- This protects your key from being pushed to the repo, but it is still visible in the browser when the app runs.

## Backend Proxy Setup (Beginner Friendly)

This project now includes a serverless backend file at `api/apod.js`.

How it works:

- The browser calls `/api/apod?start_date=...&end_date=...`
- The serverless function reads `NASA_API_KEY` from server environment variables
- The server calls NASA APOD and returns data back to the browser
- Result: your real key is not exposed in frontend source code

### Deploy on Vercel

1. Push this repo to GitHub.
2. Go to Vercel and import the GitHub repo.
3. In Project Settings > Environment Variables, add:
   - Name: `NASA_API_KEY`
   - Value: your NASA key
4. Redeploy the project.

### Local Testing Notes

- If you run only a static server (no backend), `script.js` falls back to direct NASA requests using `js/config.js`.
- If you run with Vercel (`vercel dev`), the app will use `/api/apod` and keep the key on the server.

### Built-in Request Throttle

- The backend proxy includes a simple per-IP throttle: `20` requests per `1 minute`.
- If the limit is exceeded, the API returns HTTP `429` and tells the user when to retry.
- This is a class-project friendly protection. For production-grade scaling, use a shared store like Redis.

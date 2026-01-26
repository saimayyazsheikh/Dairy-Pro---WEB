/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#4CAF50", // Soft Green
                secondary: "#FF9800", // Orange? Or maybe use custom farm colors
                accent: "#8BC34A",
                background: "#F9FAF9", // Soft Gray/White
            }
        },
    },
    plugins: [],
}

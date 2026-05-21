const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Your precise hometown coordinates
const LAT = '22.892016';
const LON = '87.052826';

// Open-Meteo API URL with ECMWF/Regional models, tracking hourly variables up to 12 hours ahead
const URL = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=temperature_2m,precipitation_probability,weather_code,wind_gusts_10m&timezone=Asia%2FKolkata&forecast_days=2`;

// WMO Weather Codes mapping for storms/heavy rain
function getWeatherDescription(code) {
    if (code === 95) return "Thunderstorm (Slight/Moderate)";
    if (code === 96 || code === 99) return "⚡ SEVERE THUNDERSTORM WITH HAIL";
    if (code >= 61 && code <= 65) return "Rain (Slight/Heavy)";
    if (code >= 80 && code <= 82) return "Rain Showers";
    return "Unsettled Weather";
}

async function checkWeather() {
    try {
        const response = await fetch(URL);
        const data = await response.json();

        if (!data.hourly) {
            throw new Error("Failed to fetch data from Open-Meteo");
        }

        const now = new Date();
        let alertTriggered = false;
        let finalMessage = `🚨 *Hometown Weather Alert* 🚨\n\n`;
        let hazardMsg = `⚠️ *High-Confidence Hazards Detected:*\n`;

                // Check the next 12 hours
        for (let i = 0; i < 12; i++) {
            const timeStr = data.hourly.time[i];
            const forecastTime = new Date(timeStr);

            // Only check future hours
            if (forecastTime > now) {
                const temp = data.hourly.temperature_2m[i];
                const rainChance = data.hourly.precipitation_probability[i];
                const code = data.hourly.weather_code[i];
                const gust = data.hourly.wind_gusts_10m[i];

                // --- THE NEW STRICT LOGIC ---
                // 1. Heavy rain alone (>= 75%)
                const isHeavyRain = rainChance >= 75;
                // 2. Thunderstorms MUST have at least a 50% rain chance to filter out dry heat alarms
                const isThunderstorm = (code === 95 || code === 96 || code === 99) && rainChance >= 50;
                // 3. Violent wind gusts >= 50 km/h
                const isHighWind = gust >= 50;

                if (isHeavyRain || isThunderstorm || isHighWind) {
                    alertTriggered = true;
                    
                    const formattedTime = forecastTime.toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    const desc = getWeatherDescription(code);
                    hazardMsg += `• *${formattedTime}:* ${desc}\n`;
                    if (rainChance > 0) hazardMsg += `  ↳ 🌧️ Rain Chance: ${rainChance}%\n`;
                    if (gust > 0) hazardMsg += `  ↳ 💨 Predicted Gusts: ${Math.round(gust)} km/h\n`;
                    hazardMsg += `  ↳ 🌡️ Temp: ${temp}°C\n`;
                }
            }
        }

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const LAT = '22.892016';
const LON = '87.052826';

const URL = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=
temperature_2m,
relative_humidity_2m,
dew_point_2m,
apparent_temperature,
precipitation_probability,
precipitation,
rain,
showers,
weather_code,
cloud_cover,
cloud_cover_low,
cloud_cover_mid,
cloud_cover_high,
cape,
lifted_index,
convective_precipitation,
surface_pressure,
wind_speed_10m,
wind_gusts_10m,
visibility
&models=ecmwf_seamless,gfs_seamless,icon_seamless
&timezone=Asia%2FKolkata
&forecast_days=2`;

function getWeatherDescription(code) {
    if (code === 0) return "Clear Sky";
    if (code <= 3) return "Cloudy";
    if (code >= 45 && code <= 48) return "Fog";
    if (code >= 51 && code <= 67) return "Rain";
    if (code >= 71 && code <= 77) return "Snow";
    if (code >= 80 && code <= 82) return "Rain Showers";
    if (code === 95) return "Thunderstorm";
    if (code === 96 || code === 99) return "Severe Thunderstorm";
    return "Unstable Weather";
}

function calculateStormRisk(data, i) {
    const rainChance = data.hourly.precipitation_probability[i] || 0;
    const gust = data.hourly.wind_gusts_10m[i] || 0;
    const cape = data.hourly.cape[i] || 0;
    const lifted = data.hourly.lifted_index[i] || 0;
    const humidity = data.hourly.relative_humidity_2m[i] || 0;
    const cloud = data.hourly.cloud_cover[i] || 0;
    const convective = data.hourly.convective_precipitation[i] || 0;
    const visibility = data.hourly.visibility[i] || 10000;

    let score = 0;

    // Rain
    if (rainChance >= 30) score += 10;
    if (rainChance >= 50) score += 20;
    if (rainChance >= 70) score += 30;
    if (rainChance >= 85) score += 40;

    // CAPE
    if (cape >= 500) score += 10;
    if (cape >= 1200) score += 20;
    if (cape >= 2500) score += 35;

    // Lifted Index
    if (lifted <= -2) score += 10;
    if (lifted <= -4) score += 20;
    if (lifted <= -6) score += 30;

    // Humidity
    if (humidity >= 70) score += 10;
    if (humidity >= 85) score += 20;

    // Wind Gust
    if (gust >= 35) score += 10;
    if (gust >= 50) score += 20;
    if (gust >= 70) score += 35;

    // Convective Rain
    if (convective >= 0.5) score += 15;
    if (convective >= 2) score += 30;

    // Cloud
    if (cloud >= 70) score += 10;

    // Low visibility
    if (visibility <= 3000) score += 10;

    if (score > 100) score = 100;

    return score;
}

function getRiskLevel(score) {
    if (score >= 85) return "🔴 EXTREME";
    if (score >= 70) return "🟠 SEVERE";
    if (score >= 50) return "🟡 MODERATE";
    if (score >= 30) return "🟢 LOW";
    return "⚪ MINIMAL";
}

async function sendTelegramMessage(message) {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        })
    });
}

async function checkWeather() {
    try {
        const response = await fetch(URL);
        const data = await response.json();

        if (!data.hourly) {
            throw new Error("Weather data unavailable");
        }

        const now = new Date();

        let alertText = `🚨 *Advanced Storm Monitor*\n\n`;
        let dangerFound = false;

        for (let i = 0; i < 24; i++) {

            const timeStr = data.hourly.time[i];
            const forecastTime = new Date(timeStr);

            if (forecastTime <= now) continue;

            const score = calculateStormRisk(data, i);

            if (score < 40) continue;

            dangerFound = true;

            const temp = data.hourly.temperature_2m[i];
            const humidity = data.hourly.relative_humidity_2m[i];
            const rainChance = data.hourly.precipitation_probability[i];
            const gust = Math.round(data.hourly.wind_gusts_10m[i]);
            const cape = Math.round(data.hourly.cape[i]);
            const lifted = data.hourly.lifted_index[i];
            const cloud = data.hourly.cloud_cover[i];
            const code = data.hourly.weather_code[i];

            const level = getRiskLevel(score);

            const formattedTime = forecastTime.toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });

            alertText += `━━━━━━━━━━━━━━\n`;
            alertText += `⏰ *${formattedTime}*\n`;
            alertText += `⚠️ *Risk:* ${level} (${score}%)\n`;
            alertText += `🌦️ *Condition:* ${getWeatherDescription(code)}\n`;
            alertText += `🌧️ *Rain Chance:* ${rainChance}%\n`;
            alertText += `💨 *Wind Gust:* ${gust} km/h\n`;
            alertText += `☁️ *Cloud Cover:* ${cloud}%\n`;
            alertText += `💧 *Humidity:* ${humidity}%\n`;
            alertText += `⚡ *CAPE:* ${cape}\n`;
            alertText += `📉 *Lifted Index:* ${lifted}\n`;
            alertText += `🌡️ *Temp:* ${temp}°C\n\n`;
        }

        if (dangerFound) {
            await sendTelegramMessage(alertText);
        } else {
            console.log("No dangerous weather detected.");
        }

    } catch (error) {
        console.error("Weather Error:", error);
    }
}

checkWeather();

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const LAT = '22.9238'; 
const LON = '87.0427';
// days=2 so we can look ahead into tomorrow, alerts=yes grabs government warnings
const URL = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${LAT},${LON}&days=2&alerts=yes`;

async function checkWeather() {
    try {
        const response = await fetch(URL);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        let alertTriggered = false;
        let finalMessage = `🚨 *Advanced Weather Alert: Bikrampur* 🚨\n\n`;

        // 1. CHECK FOR OFFICIAL GOVERNMENT ALERTS (IMD / SDMA)
        if (data.alerts && data.alerts.alert && data.alerts.alert.length > 0) {
            alertTriggered = true;
            finalMessage += `⚠️ *OFFICIAL WARNINGS:*\n`;
            
            data.alerts.alert.forEach(alert => {
                finalMessage += `• *${alert.event}*\n`;
            });
            finalMessage += `\n`;
        }

        // 2. CHECK THE NEXT 12 HOURS FOR SEVERE HAZARDS
        const currentEpoch = Math.floor(Date.now() / 1000);
        let upcomingHazards = false;
        let hazardMsg = `⚠️ *Upcoming Hazards Detected:*\n`;

        // Combine hours from today and tomorrow to safely look 12 hours ahead
        const allHours = [...data.forecast.forecastday[0].hour, ...data.forecast.forecastday[1].hour];
        const futureHours = allHours.filter(h => h.time_epoch > currentEpoch).slice(0, 12);

        for (const hour of futureHours) {
            const rainChance = hour.chance_of_rain;
            const condition = hour.condition.text.toLowerCase();
            const gust = hour.gust_kph; // Track upcoming wind gusts
            const cloudCover = hour.cloud;
            
            // Trigger if Rain Chance >= 30%, mentions rain/thunder, OR Wind Gusts >= 40 km/h
            if (rainChance >= 30 || condition.includes("rain") || condition.includes("thunder") || gust >= 40) {
                upcomingHazards = true;
                alertTriggered = true;
                
                const timeString = new Date(hour.time_epoch * 1000).toLocaleString('en-IN', { 
                    timeZone: 'Asia/Kolkata', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                hazardMsg += `• *${timeString}:* ${hour.condition.text}\n`;
                
                // Add advanced details below the trigger time
                if (rainChance >= 30) hazardMsg += `  ↳ 🌧️ Rain Chance: ${rainChance}%\n`;
                if (gust >= 40) hazardMsg += `  ↳ 💨 Dangerous Wind Gusts: ${gust} km/h\n`;
                if (cloudCover >= 80) hazardMsg += `  ↳ ☁️ Heavy Cloud Cover: ${cloudCover}%\n`;
            }
        }

        if (upcomingHazards) {
            finalMessage += hazardMsg;
        }

        // SEND THE ALERT TO TELEGRAM WITH CURRENT ADVANCED DATA
        if (alertTriggered) {
            finalMessage += `\n📊 *Live Data:* Temp: ${data.current.temp_c}°C | Pressure: ${data.current.pressure_mb} mb | Humidity: ${data.current.humidity}%\n_Stay safe!_`;
            await sendTelegramMessage(finalMessage);
            console.log("Alert sent successfully.");
        } else {
            console.log("Weather is clear. No alert needed.");
        }

    } catch (error) {
        console.error("Error checking weather:", error);
    }
}

async function sendTelegramMessage(text) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: text,
            parse_mode: 'Markdown'
        })
    });
}

checkWeather();

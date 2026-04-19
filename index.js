// index.js
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Pinpoint Coordinates for Bikrampur/Simlapal, Bankura, WB
const LAT = '22.9238'; 
const LON = '87.0427';
const URL = `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&appid=${WEATHER_API_KEY}&units=metric`;

async function checkWeather() {
    try {
        const response = await fetch(URL);
        const data = await response.json();

        if (data.cod !== "200") {
            throw new Error(`Weather API Error: ${data.message}`);
        }

        // Check the next 12 hours (4 forecast periods of 3 hours each)
        const upcomingForecasts = data.list.slice(0, 4);
        let alertMessage = "";
        let alertTriggered = false;

            for (const forecast of upcomingForecasts) {
            const weatherId = forecast.weather[0].id;
            const weatherDesc = forecast.weather[0].description;
            
            // POP is Probability of Precipitation (0.0 to 1.0)
            // Multiply by 100 to get a percentage
            const rainChance = Math.round((forecast.pop || 0) * 100); 
            
            const time = new Date(forecast.dt * 1000).toLocaleString('en-IN', { 
                timeZone: 'Asia/Kolkata',
                weekday: 'short', 
                hour: '2-digit', 
                minute: '2-digit' 
            });

            // TRIGGER IF: Weather ID is rain/storm OR Rain Chance is 30% or higher
            if (weatherId < 800 || rainChance >= 30) {
                alertTriggered = true;
                alertMessage += `• ${time}: ⚠️ *${weatherDesc.toUpperCase()}* (Rain Chance: ${rainChance}%)\n`;
            }
        }

        if (alertTriggered) {
            const currentTemp = upcomingForecasts[0].main.temp;
            const finalMessage = `🚨 *Weather Alert: Bikrampur, Bankura* 🚨\n\nConditions expected:\n${alertMessage}\n🌡️ Current Temp: ${currentTemp}°C\n\n_Stay safe!_`;

            await sendTelegramMessage(finalMessage);
            console.log("Alert sent successfully.");
        } else {
            // IT IS NOW SILENT AGAIN. No spam!
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

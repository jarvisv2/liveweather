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
            
            // Format time to Indian Standard Time (IST)
            const time = new Date(forecast.dt * 1000).toLocaleString('en-IN', { 
                timeZone: 'Asia/Kolkata',
                weekday: 'short', 
                hour: '2-digit', 
                minute: '2-digit' 
            });

            // OpenWeatherMap IDs: 2xx (Thunderstorm), 3xx (Drizzle), 5xx (Rain), 6xx (Snow), 7xx (Severe Atmosphere)
            if (weatherId < 800) {
                alertTriggered = true;
                alertMessage += `• ${time}: ⚠️ *${weatherDesc.toUpperCase()}*\n`;
            }
        }

        if (alertTriggered) {
            const currentTemp = upcomingForecasts[0].main.temp;
            const finalMessage = `🚨 *Weather Alert: Bikrampur, Bankura* 🚨\n\nConditions expected:\n${alertMessage}\n🌡️ Current Temp: ${currentTemp}°C\n\n_Stay safe!_`;
            
            await sendTelegramMessage(finalMessage);
            console.log("Alert sent successfully.");
        } else {
            // FORCING A TEST MESSAGE TO TELEGRAM
            const currentTemp = upcomingForecasts[0].main.temp;
            const testMessage = `🤖 *Test Message:* Your weather bot is connected perfectly!\n\nThe sky over Bikrampur is currently clear (Temp: ${currentTemp}°C). I will stay quiet until I spot rain!`;
            
            await sendTelegramMessage(testMessage);
            console.log("Weather is clear. Test message sent to Telegram.");
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

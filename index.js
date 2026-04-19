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
        let finalMessage = `🚨 *Weather Alert: Bikrampur, Bankura* 🚨\n\n`;

        // 1. CHECK FOR OFFICIAL GOVERNMENT ALERTS (IMD / SDMA)
        if (data.alerts && data.alerts.alert && data.alerts.alert.length > 0) {
            alertTriggered = true;
            finalMessage += `⚠️ *OFFICIAL WARNINGS:*\n`;
            
            data.alerts.alert.forEach(alert => {
                // Get the event name (e.g., "Yellow Watch for Lightning")
                finalMessage += `• *${alert.event}*\n`;
            });
            finalMessage += `\n`;
        }

        // 2. CHECK THE NEXT 12 HOURS FOR RAIN/STORMS
        const currentEpoch = Math.floor(Date.now() / 1000);
        let upcomingRain = false;
        let rainMsg = `🌧️ *Upcoming Conditions:*\n`;

        // Combine hours from today and tomorrow to safely look 12 hours ahead
        const allHours = [...data.forecast.forecastday[0].hour, ...data.forecast.forecastday[1].hour];
        const futureHours = allHours.filter(h => h.time_epoch > currentEpoch).slice(0, 12);

        for (const hour of futureHours) {
            const rainChance = hour.chance_of_rain;
            const condition = hour.condition.text.toLowerCase();
            
            // Trigger if Rain Chance is >= 30% OR condition mentions rain/thunder
            if (rainChance >= 30 || condition.includes("rain") || condition.includes("thunder")) {
                upcomingRain = true;
                alertTriggered = true;
                
                const timeString = new Date(hour.time_epoch * 1000).toLocaleString('en-IN', { 
                    timeZone: 'Asia/Kolkata', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                rainMsg += `• ${timeString}: ${hour.condition.text} (Rain Chance: ${rainChance}%)\n`;
            }
        }

        if (upcomingRain) {
            finalMessage += rainMsg;
        }

        // SEND THE ALERT TO TELEGRAM
        if (alertTriggered) {
            finalMessage += `\n🌡️ Current Temp: ${data.current.temp_c}°C\n_Stay safe!_`;
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

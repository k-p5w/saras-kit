// clock-engine.js
let cache = { key: null, sunrise: 0, sunset: 0 };

function getTokiData(lat = 35.69, lon = 139.79) {
    const now = new Date();
    const today = now.toDateString();
    // 地点ごとにキャッシュを分ける
    const cacheKey = `${today}_${lat}_${lon}`;
    
    if (cache.key !== cacheKey) {
        const doy = (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 0)) / 86400000;
        const B = 2 * Math.PI * (doy - 81) / 364;
        const eot = (9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B)) / 60;
        const decl = 0.409 * Math.sin(0.0172 * (doy - 80));
        const horizon = -6 * Math.PI / 180;
        const cosHourAngle = (Math.sin(horizon) - Math.sin(lat * Math.PI / 180) * Math.sin(decl)) / (Math.cos(lat * Math.PI / 180) * Math.cos(decl));
        const hourAngle = Math.acos(Math.max(-1, Math.min(1, cosHourAngle))) * 180 / Math.PI / 15;
        
        cache = { 
            key: cacheKey, 
            sunrise: 12 - hourAngle - (lon - 135)/15 + eot, 
            sunset: 12 + hourAngle - (lon - 135)/15 + eot 
        };
    }

    const currentTime = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    const dayLen = (cache.sunset - cache.sunrise) / 6;
    const nightLen = (24 - (cache.sunset - cache.sunrise)) / 6;
    
    let idx, progress;
    if (currentTime >= cache.sunrise && currentTime < cache.sunset) {
        progress = Math.min(5.999, (currentTime - cache.sunrise) / dayLen);
        idx = Math.floor(progress);
    } else {
        const timeFromSunset = (currentTime >= cache.sunset) ? (currentTime - cache.sunset) : (currentTime + (24 - cache.sunset));
        progress = Math.min(5.999, timeFromSunset / nightLen);
        idx = 6 + Math.floor(progress);
    }

    return {
        shiIdx: idx,
        kokuIdx: Math.floor((progress % 1) * 4),
        bellCount: [6, 5, 4, 9, 8, 7, 6, 5, 4, 9, 8, 7][idx],
        shiName: ["卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑", "寅"][idx]
    };
}
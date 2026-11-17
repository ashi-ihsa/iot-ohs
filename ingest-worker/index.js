require('dotenv').config();
const mqtt = require('mqtt');
const { Pool } = require('pg');
const mqttPrefix = process.env.MQTT_PREFIX;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle PostgreSQL client', err);
});

// MEMORY CACHE: Menyimpan daftar deviceId yang valid di memori
let validDevices = new Set();

// Fungsi untuk memuat ulang daftar device dari database
async function loadValidDevices() {
    try {
        const result = await pool.query('SELECT "id" FROM workers');
        validDevices.clear();
        result.rows.forEach(row => validDevices.add(row.id));
        console.log(`📋 Cache diperbarui: ${validDevices.size} device terdaftar diizinkan.`);
    } catch (error) {
        console.error('❌ Gagal memuat daftar device:', error.message);
    }
}

// 2. Konfigurasi Koneksi MQTT Broker
const mqttUrl = process.env.MQTT_URL;
const client = mqtt.connect(mqttUrl, {
    reconnectPeriod: 1000
});

client.on('connect', async () => {
    console.log('✅ Ingest Worker terhubung ke MQTT Broker!');
    
    // Muat cache device saat pertama kali worker menyala
    await loadValidDevices();

    // Set interval untuk memperbarui cache setiap 5 menit (tanpa query berlebihan)
    setInterval(loadValidDevices, 5 * 60 * 1000);

    client.subscribe(`${mqttPrefix}/telemetry/+`, (err) => {
        if (!err) console.log(`📡 Subscribed: ${mqttPrefix}/telemetry/+`);
    });
    client.subscribe(`${mqttPrefix}/alert/+`, (err) => {
        if (!err) console.log(`🚨 Subscribed: ${mqttPrefix}/alert/+`);
    });
});

client.on('offline', () => {
    console.warn('⚠️ MQTT Client offline. Mencoba menghubungkan kembali...');
});

client.on('error', (err) => {
    console.error('❌ MQTT Error:', err.message);
});

// 3. Tangani Pesan Masuk dari MQTT
client.on('message', async (topic, payload) => {
    try {
        const topicParts = topic.split('/');
        // Format topik: [prefix] / [telemetry/alert] / [deviceId]
        const deviceId = topicParts[topicParts.length - 1];
        const messageType = topicParts[topicParts.length - 2]; 

        // Proteksi jika payload kosong atau bukan JSON valid
        let data;
        try {
            data = JSON.parse(payload.toString());
        } catch (e) {
            console.warn(`⚠️ Payload dari device ${deviceId} bukan format JSON yang valid.`);
            return;
        }

        // --- VALIDASI CACHE DI MEMORI ---
        // Jika device tidak ada di cache, tolak/abaikan langsung tanpa query ke DB
        if (!validDevices.has(deviceId)) {
            console.warn(`🚫 Akses ditolak: Device "${deviceId}" tidak terdaftar dalam sistem.`);
            return;
        }

        const timestamp = new Date().toISOString();

        if (messageType === 'telemetry') {
            const query = `
                INSERT INTO telemetries ("deviceId", timestamp, longitude, latitude, heartrate, spo2) 
                VALUES ($1, $2, $3, $4, $5, $6);
            `;
            const values = [
                deviceId, 
                timestamp, 
                data.longitude || 0, 
                data.latitude || 0, 
                data.bpm || 0, 
                data.spo2 || 0
            ];

            await pool.query(query, values);
            console.log(`📥 Telemetry disimpan untuk device: ${deviceId}`);

        } else if (messageType === 'alert') {
            const query = `
                INSERT INTO alerts ("deviceId", timestamp) 
                VALUES ($1, $2);
            `;
            const values = [deviceId, timestamp];

            await pool.query(query, values);
            console.warn(`⚠️ Alert disimpan untuk device: ${deviceId}`);
        }

    } catch (error) {
        console.error('❌ Gagal menulis ke Database PostgreSQL:', error.message);
    }
});
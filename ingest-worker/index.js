require('dotenv').config();
const mqtt = require('mqtt');
const { Pool } = require('pg');

// 1. Konfigurasi Koneksi PostgreSQL Cloud
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // ssl: { rejectUnauthorized: false } // Aktifkan jika pakai Supabase/Neon
});

// PENTING: Mencegah aplikasi crash total jika koneksi database terputus sesaat
pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle PostgreSQL client', err);
    // Jangan exit proses, biarkan pool mencoba recover
});

// 2. Konfigurasi Koneksi MQTT Broker
const mqttUrl = process.env.MQTT_URL;
const client = mqtt.connect(mqttUrl, {
    reconnectPeriod: 1000 // Coba reconnect setiap 1 detik jika putus
});

client.on('connect', () => {
    console.log('✅ Ingest Worker terhubung ke MQTT Broker!');
    
    client.subscribe('+/telemetry/+', (err) => {
        if (!err) console.log('📡 Subscribed: +/telemetry/+');
    });
    client.subscribe('+/alert/+', (err) => {
        if (!err) console.log('🚨 Subscribed: +/alert/+');
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
            console.log('📥 Telemetry saved.');

        } else if (messageType === 'alert') {
            const query = `
                INSERT INTO alerts ("deviceId", timestamp) 
                VALUES ($1, $2);
            `;
            const values = [deviceId, timestamp];

            await pool.query(query, values);
            console.warn('⚠️ Alert saved.');
        }

    } catch (error) {
        // Menangkap error database tanpa membuat worker mati
        console.error('❌ Gagal menulis ke Database PostgreSQL:', error.message);
    }
});
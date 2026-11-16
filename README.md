# IoT Worker Safety & OHS Monitoring System

Sistem Internet of Things (IoT) untuk pemantauan kesehatan dan keselamatan kerja (Occupational Health and Safety / OHS) secara *real-time*. Proyek skripsi ini menggunakan arsitektur **Hybrid Cloud-Edge**, di mana proses penerimaan data (ingestion) dan penyimpanan dilakukan secara terpusat di cloud (24/7), sementara visualisasi dan monitoring lokal dilakukan di sisi *edge* (laptop/PC lokal).

---

## 📂 Struktur Repositori

Proyek ini dibagi menjadi 3 komponen utama (folder):

```text
├── database/            # Skema database dan migrasi menggunakan node-pg-migrate
├── ingest-worker/       # Layanan cloud worker untuk menangkap MQTT dan menulis ke PostgreSQL
└── local-monitoring/    # Dashboard Node-RED lokal untuk visualisasi dan pemantauan (Read-Only)
```

## Keamanan sebelum push

- Simpan kredensial lokal di file `.env`; jangan commit file tersebut. File `.env.example` hanya berisi placeholder dan boleh dijadikan template.
- Jangan commit log, dump database, backup, atau data operasional. Data lokasi dan kesehatan pekerja bersifat sensitif; jangan masukkan nilainya ke log atau contoh publik.
- Jika kredensial pernah ter-push, segera rotasi kredensial tersebut. Menghapus file pada commit terbaru saja tidak menghapusnya dari riwayat Git.

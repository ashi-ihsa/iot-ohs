export const shorthands = undefined;

export const up = (pgm) => {
  pgm.createTable("alerts", {
    deviceId: {
      type: "varchar(50)",
      notNull: true,
    },
    timestamp: {
      type: "TEXT",
      notNull: true,
    },
  });

  pgm.addConstraint(
    'alerts',
    'fk_alerts.deviceId',
    'FOREIGN KEY ("deviceId") REFERENCES workers(id) ON DELETE CASCADE'
  );
};

export const down = (pgm) => {
  pgm.dropTable("alerts");
};
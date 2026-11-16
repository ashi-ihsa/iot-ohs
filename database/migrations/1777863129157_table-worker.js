export const shorthands = undefined;

export const up = (pgm) => {
  pgm.createTable("workers", {
    id: {
      type: "varchar(50)",
      primaryKey: true,
    },
    name: {
      type: "varchar(255)",
      notNull: true,
    },
    phone_number: {
      type: "varchar(100)",
      notNull: false,
    },
  });

};

export const down = (pgm) => {
  pgm.dropTable("workers");
};

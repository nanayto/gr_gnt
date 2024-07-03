const exampleData = {
  Number: 14999,
  Issued: Date.parse('2020-10-12') / 1000,
  Due: Date.parse('2020-11-12') / 1000,

  Auftragr: {
    Name: 'Thunderous Applause',
    Strasse1: '812 Automated Rd',
    Strasse2: null,
    Ort: 'New York',
    State: 'NY',
    Plz: '10003',
    Email: 'applause@thunder.com',
    Phone: '+1-800-111-1111',
    Website: 'applause.com',
  },

  Kunde: {
    Name: 'Monkeys Juggling',
    Strasse1: '100 Banana St',
    Ort: 'Bananaberg',
    State: 'NJ',
    Plz: '07048',
  },

  Positionen: [
    {
      Produkt: 'Wolf Whistle',
      Preis: 35,
      Menge: 3,
      Summe: 105,
    },
    {
      Produkt: 'Bravo',
      Preis: 30,
      Menge: 17,
      Summe: 510,
    },
  ],

  Netto: 615,
  Deduction: null,
  USt: null,
  Summe: 615,
};

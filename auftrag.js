function ready(fn) {
  if (document.readyState !== 'loading'){
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

function addDemo(row) {
  if (!row.Datum && !row.Due) {
    for (const key of ['Number', 'Datum', 'Due']) {
      if (!row[key]) { row[key] = key; }
    }
    for (const key of ['Netto', 'Deduction', 'USt', 'Summe']) {
      if (!(key in row)) { row[key] = key; }
    }
    if (!('Kommentar' in row)) { row.Kommentar = '(Anything in a Kommentar column goes here)'; }
  }
  if (!row.Auftragr) {
    row.Auftragr = {
      Name: 'Auftragr.Name',
      Strasse1: 'Auftragr.Strasse1',
      Strasse2: 'Auftragr.Strasse2',
      Ort: 'Auftragr.Ort',
      State: '.State',
      Plz: '.Plz',
      Email: 'Auftragr.Email',
      Phone: 'Auftragr.Phone',
      Website: 'Auftragr.Website'
    }
  }
  if (!row.Kunde) {
    row.Kunde = {
      Name: 'Kunde.Name',
      Strasse1: 'Kunde.Strasse1',
      Strasse2: 'Kunde.Strasse2',
      Ort: 'Kunde.Ort',
      State: '.State',
      Plz: '.Plz'
    }
  }
  if (!row.Positionen) {
    row.Positionen = [
      {
        Produkt: 'Positionen[0].Produkt',
        Menge: '.Menge',
        Summe: '.Summe',
        Preis: '.Preis',
      },
      {
        Produkt: 'Positionen[1].Produkt',
        Menge: '.Menge',
        Summe: '.Summe',
        Preis: '.Preis',
      },
    ];
  }
  return row;
}

const data = {
  count: 0,
  auftrag: '',
  status: 'waiting',
  tableConnected: false,
  rowConnected: false,
  haveRows: false,
};
let app = undefined;

Vue.filter('currency', formatNumberAsUSD)
function formatNumberAsUSD(value) {
  if (typeof value !== "number") {
    return value || '—';      // falsy value would be shown as a dash.
  }
  value = Math.round(value * 100) / 100;    // Round to nearest cent.
  value = (value === -0 ? 0 : value);       // Avoid negative zero.

  const result = value.toLocaleString('en', {
    style: 'currency', currency: 'EUR'
  })
  if (result.includes('NaN')) {
    return value;
  }
  return result;
}

Vue.filter('booleanToSymbol', function (value) {
  if (typeof value !== "boolean") {
    return value || '—';  // falsy value would be shown as a dash.
  }
  return value ? '✔️' : '❌';
});

Vue.filter('fallback', function(value, str) {
  if (!value) {
    throw new Error("Please provide column " + str);
  }
  return value;
});

Vue.filter('asDate', function(value) {
  if (typeof(value) === 'number') {
    value = new Date(value * 1000);
  }
  const date = moment.utc(value)
  return date.isValid() ? date.format('DD/MM/YYYY') : value;
});

function tweakUrl(url) {
  if (!url) { return url; }
  if (url.toLowerCase().startsWith('http')) {
    return url;
  }
  return 'https://' + url;
};

function handleError(err) {
  console.error(err);
  const target = app || data;
  target.auftrag = '';
  target.status = String(err).replace(/^Error: /, '');
  console.log(data);
}

function prepareList(lst, order) {
  if (order) {
    let orderedLst = [];
    const remaining = new Set(lst);
    for (const key of order) {
      if (remaining.has(key)) {
        remaining.delete(key);
        orderedLst.push(key);
      }
    }
    lst = [...orderedLst].concat([...remaining].sort());
  } else {
    lst = [...lst].sort();
  }
  return lst;
}

function updateAuftrag(row) {
  try {
    data.status = '';
    if (row === null) {
      throw new Error("(No data - not on row - please add or select a row)");
    }
    console.log("GOT...", JSON.stringify(row));
    if (row.References) {
      try {
        Object.assign(row, row.References);
      } catch (err) {
        throw new Error('Could not understand References column. ' + err);
      }
    }

    // Add some guidance about columns.
    const want = new Set(Object.keys(addDemo({})));
    const accepted = new Set(['References']);
    const importance = ['Number', 'Kunde', 'Positionen', 'Summe', 'Auftragr', 'Datum', 'Anzahlungsdatum', 'Netto', 'Deduction', 'USt', 'Kommentar', 'Klischeekosten', 'Farbigkeit'];
    if (!(row.Due || row.Datum)) {
      const seen = new Set(Object.keys(row).filter(k => k !== 'id' && k !== '_error_'));
      const help = row.Help = {};
      help.seen = prepareList(seen);
      const missing = [...want].filter(k => !seen.has(k));
      const ignoring = [...seen].filter(k => !want.has(k) && !accepted.has(k));
      const recognized = [...seen].filter(k => want.has(k) || accepted.has(k));
      if (missing.length > 0) {
        help.expected = prepareList(missing, importance);
      }
      if (ignoring.length > 0) {
        help.ignored = prepareList(ignoring);
      }
      if (recognized.length > 0) {
        help.recognized = prepareList(recognized);
      }
      if (!seen.has('References') && !(row.Datum || row.Due)) {
        row.SuggestReferencesColumn = true;
      }
    }
    addDemo(row);
    if (!row.Netto && !row.Summe && row.Positionen && Array.isArray(row.Positionen)) {
      try {
        row.Netto = row.Positionen.reduce((a, b) => a + b.Preis * b.Menge, 0);
        row.Summe = row.Netto + (row.USt || 0) - (row.Deduction || 0);
      } catch (e) {
        console.error(e);
      }
    }
    if (row.Auftragr && row.Auftragr.Website && !row.Auftragr.Url) {
      row.Auftragr.Url = tweakUrl(row.Auftragr.Website);
    }

    // Fiddle around with updating Vue (I'm not an expert).
    for (const key of want) {
      Vue.delete(data.auftrag, key);
    }
    for (const key of ['Help', 'SuggestReferencesColumn', 'References']) {
      Vue.delete(data.auftrag, key);
    }
    data.auftrag = Object.assign({}, data.auftrag, row);

    // Make auftrag information available for debugging.
    window.auftrag = row;
  } catch (err) {
    handleError(err);
  }
}

ready(function() {
  // Update the auftrag anytime the document data changes.
  grist.ready();
  grist.onRecord(updateAuftrag);

  // Monitor status so we can give user advice.
  grist.on('message', msg => {
    // If we are told about a table but not which row to access, check the
    // number of rows.  Currently if the table is empty, and "select by" is
    // not set, onRecord() will never be called.
    if (msg.tableId && !app.rowConnected) {
      grist.docApi.fetchSelectedTable().then(table => {
        if (table.id && table.id.length >= 1) {
          app.haveRows = true;
        }
      }).catch(e => console.log(e));
    }
    if (msg.tableId) { app.tableConnected = true; }
    if (msg.tableId && !msg.dataChange) { app.RowConnected = true; }
  });

  Vue.config.errorHandler = function (err, vm, info)  {
    handleError(err);
  };

  app = new Vue({
    el: '#app',
    data: data
  });

  if (document.location.search.includes('demo')) {
    updateAuftrag(exampleData);
  }
  if (document.location.search.includes('labels')) {
    updateAuftrag({});
  }
});
